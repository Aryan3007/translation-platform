import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { ProjectService } from './project/project.service';
import { ProjectController } from './project/project.controller';
import { LanguageService } from './language/language.service';
import { LanguageController } from './language/language.controller';
import { TranslationService } from './translation/translation.service';
import { TranslationController } from './translation/translation.controller';
import { AiService } from './ai/ai.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [
    AuthController,
    ProjectController,
    LanguageController,
    TranslationController,
  ],
  providers: [
    PrismaService,
    RedisService,
    AuthService,
    ProjectService,
    LanguageService,
    TranslationService,
    AiService,
  ],
})
export class AppModule {}
