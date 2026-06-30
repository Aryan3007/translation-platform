import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AiService } from '../ai/ai.service';
import { RegisterKeyDto, UpdateTranslationDto, TranslationsBundle, TranslationsGridItem } from '@translation-platform/shared';

@Injectable()
export class TranslationService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private aiService: AiService,
  ) {}

  /**
   * Fetches a flat key-value bundle of translations for a project and language.
   * Leverages Redis cache; fallbacks to Postgres and rebuilds cache if empty.
   */
  async getTranslationsBundle(projectName: string, languageCode: string): Promise<TranslationsBundle> {
    const cacheKey = `translations:${projectName.toLowerCase()}:${languageCode.toLowerCase()}`;
    
    // 1. Try Redis cache
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // 2. Fetch from database
    const project = await this.prisma.project.findFirst({
      where: { name: { equals: projectName, mode: 'insensitive' } },
    });

    if (!project) {
      throw new NotFoundException(`Project "${projectName}" not found`);
    }

    const keys = await this.prisma.translationKey.findMany({
      where: { projectId: project.id },
      include: {
        translations: {
          where: { languageCode: { equals: languageCode, mode: 'insensitive' } },
        },
      },
    });

    // 3. Build bundle (use translation if TRANSLATED or AI_TRANSLATED, otherwise fallback to defaultValue)
    const bundle: TranslationsBundle = {};
    for (const key of keys) {
      const translation = key.translations[0];
      if (translation && (translation.status === 'TRANSLATED' || translation.status === 'AI_TRANSLATED')) {
        bundle[key.key] = translation.translatedValue;
      } else {
        bundle[key.key] = key.defaultValue;
      }
    }

    // 4. Cache in Redis (TTL: 24 Hours)
    await this.redisService.set(cacheKey, JSON.stringify(bundle), 86400);

    return bundle;
  }

  /**
   * Registers a missing key (typically called by client SDKs).
   * Automatically populates the default language (e.g., 'en') with the default value.
   */
  async registerKey(projectApiKey: string, dto: RegisterKeyDto): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { apiKey: projectApiKey },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // 1. Find or create translation key
    let translationKey = await this.prisma.translationKey.findUnique({
      where: {
        projectId_key_namespace: {
          projectId: project.id,
          key: dto.key,
          namespace: dto.namespace,
        },
      },
    });

    if (!translationKey) {
      translationKey = await this.prisma.translationKey.create({
        data: {
          projectId: project.id,
          key: dto.key,
          namespace: dto.namespace,
          defaultValue: dto.defaultValue,
        },
      });

      // 2. Populate translation records for all active languages
      const languages = await this.prisma.language.findMany();
      
      const translationsToCreate = languages.map((lang) => {
        const isDefaultLanguage = lang.code.toLowerCase() === 'en';
        return {
          translationKeyId: translationKey!.id,
          languageCode: lang.code,
          translatedValue: isDefaultLanguage ? dto.defaultValue : '',
          status: (isDefaultLanguage ? 'TRANSLATED' : 'MISSING') as 'TRANSLATED' | 'MISSING',
        };
      });

      await this.prisma.translation.createMany({
        data: translationsToCreate,
      });

      // 3. Invalidate Redis cache for all languages in this project
      await this.redisService.delPattern(`translations:${project.name.toLowerCase()}:*`);

      // 4. Trigger AI translation in the background if enabled
      if (project.aiEnabled) {
        this.runAiTranslation(
          project.id,
          project.name,
          translationKey.id,
          dto.defaultValue,
          project.aiProvider as 'gemini' | 'openai'
        ).catch((err) => {
          console.error('Background AI Translation failed:', err);
        });
      }
    }
  }

  /**
   * Asynchronous background translation task using the selected LLM provider.
   */
  private async runAiTranslation(
    projectId: string,
    projectName: string,
    translationKeyId: string,
    text: string,
    provider: 'gemini' | 'openai'
  ): Promise<void> {
    // Fetch enabled languages for translation (excluding English 'en')
    const languages = await this.prisma.language.findMany({
      where: {
        enabled: true,
        code: { not: { equals: 'en', mode: 'insensitive' } },
      },
    });

    if (languages.length === 0) return;

    const targetLangCodes = languages.map((l) => l.code);
    
    // Call AI service to translate
    const translations = await this.aiService.translateText(text, targetLangCodes, provider);

    // Save the translations as AI_TRANSLATED
    for (const langCode of Object.keys(translations)) {
      const translatedValue = translations[langCode];
      if (!translatedValue) continue;

      await this.prisma.translation.upsert({
        where: {
          translationKeyId_languageCode: {
            translationKeyId,
            languageCode: langCode,
          },
        },
        update: {
          translatedValue,
          status: 'AI_TRANSLATED',
        },
        create: {
          translationKeyId,
          languageCode: langCode,
          translatedValue,
          status: 'AI_TRANSLATED',
        },
      });
    }

    // Invalidate Redis cache since new translations are added
    await this.redisService.delPattern(`translations:${projectName.toLowerCase()}:*`);
  }

  /**
   * Updates or creates a translation value. Called by the Admin Dashboard.
   * Invalidates the Redis cache for this specific project and language.
   */
  async updateTranslation(dto: UpdateTranslationDto): Promise<void> {
    const key = await this.prisma.translationKey.findUnique({
      where: { id: dto.keyId },
      include: { project: true },
    });

    if (!key) {
      throw new NotFoundException('Translation key not found');
    }

    // Update or create the translation
    await this.prisma.translation.upsert({
      where: {
        translationKeyId_languageCode: {
          translationKeyId: dto.keyId,
          languageCode: dto.languageCode,
        },
      },
      update: {
        translatedValue: dto.translatedValue,
        status: dto.status,
      },
      create: {
        translationKeyId: dto.keyId,
        languageCode: dto.languageCode,
        translatedValue: dto.translatedValue,
        status: dto.status,
      },
    });

    // Invalidate Redis cache for this project and language
    const cacheKey = `translations:${key.project.name.toLowerCase()}:${dto.languageCode.toLowerCase()}`;
    await this.redisService.del(cacheKey);
  }

  /**
   * Returns all keys and their translations for a project to build the dashboard grid.
   */
  async getTranslationsGrid(projectId: string): Promise<TranslationsGridItem[]> {
    const keys = await this.prisma.translationKey.findMany({
      where: { projectId },
      include: {
        translations: true,
      },
      orderBy: { key: 'asc' },
    });

    return keys.map((key) => {
      const translationsMap: Record<string, { id: string; translatedValue: string; status: 'TRANSLATED' | 'MISSING' | 'OUTDATED' | 'AI_TRANSLATED' }> = {};
      for (const t of key.translations) {
        translationsMap[t.languageCode] = {
          id: t.id,
          translatedValue: t.translatedValue,
          status: t.status as 'TRANSLATED' | 'MISSING' | 'OUTDATED' | 'AI_TRANSLATED',
        };
      }

      return {
        id: key.id,
        key: key.key,
        namespace: key.namespace,
        defaultValue: key.defaultValue,
        translations: translationsMap,
      };
    });
  }
}
