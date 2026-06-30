import { Controller, Get, Post, Put, Body, Param, UseGuards, Req } from '@nestjs/common';
import { TranslationService } from './translation.service';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { JwtGuard } from '../auth/jwt.guard';
import { UpdateTranslationDto, RegisterKeyDto } from '@translation-platform/shared';

@Controller('v1')
export class TranslationController {
  constructor(private translationService: TranslationService) {}

  /**
   * Client SDK fetches translation bundle for a project and language.
   * Public endpoint.
   */
  @Get('translations/:project/:language')
  async getBundle(
    @Param('project') project: string,
    @Param('language') language: string,
  ) {
    return this.translationService.getTranslationsBundle(project, language);
  }

  /**
   * Client SDK registers a missing key.
   * Protected by ApiKeyGuard.
   */
  @Post('keys')
  @UseGuards(ApiKeyGuard)
  async registerKey(
    @Req() req: any,
    @Body() body: { key: string; namespace?: string; defaultValue?: string; default?: string },
  ) {
    const project = req.project;
    
    // Support both 'defaultValue' and 'default' from the client SDK
    const defaultValue = body.defaultValue || body.default || '';
    const namespace = body.namespace || 'common';

    const dto: RegisterKeyDto = {
      key: body.key,
      namespace,
      defaultValue,
    };

    return this.translationService.registerKey(project.apiKey, dto);
  }

  /**
   * Admin Dashboard updates a translation.
   * Protected by JwtGuard.
   */
  @Put('translations')
  @UseGuards(JwtGuard)
  async updateTranslation(@Body() dto: UpdateTranslationDto) {
    return this.translationService.updateTranslation(dto);
  }

  /**
   * Admin Dashboard retrieves the translations grid.
   * Protected by JwtGuard.
   */
  @Get('translations/grid/:projectId')
  @UseGuards(JwtGuard)
  async getGrid(@Param('projectId') projectId: string) {
    return this.translationService.getTranslationsGrid(projectId);
  }
}
