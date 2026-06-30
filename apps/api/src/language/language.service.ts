import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLanguageDto } from '@translation-platform/shared';

@Injectable()
export class LanguageService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateLanguageDto) {
    const existing = await this.prisma.language.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException('Language with this code already exists');
    }

    const language = await this.prisma.language.create({
      data: {
        code: dto.code,
        name: dto.name,
        enabled: dto.enabled,
      },
    });

    // Auto-create missing translation records for all existing translation keys
    const keys = await this.prisma.translationKey.findMany();
    if (keys.length > 0) {
      await this.prisma.translation.createMany({
        data: keys.map((key) => ({
          translationKeyId: key.id,
          languageCode: language.code,
          translatedValue: '',
          status: 'MISSING' as const,
        })),
        skipDuplicates: true,
      });
    }

    return language;
  }

  async findAll() {
    return this.prisma.language.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async update(code: string, dto: { enabled: boolean }) {
    return this.prisma.language.update({
      where: { code },
      data: { enabled: dto.enabled },
    });
  }
}
