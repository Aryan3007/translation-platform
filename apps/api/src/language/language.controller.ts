import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import { LanguageService } from './language.service';
import { JwtGuard } from '../auth/jwt.guard';
import { CreateLanguageDto } from '@translation-platform/shared';

@Controller('v1/languages')
export class LanguageController {
  constructor(private languageService: LanguageService) {}

  @Get()
  async findAll() {
    return this.languageService.findAll();
  }

  @Post()
  @UseGuards(JwtGuard)
  async create(@Body() dto: CreateLanguageDto) {
    return this.languageService.create(dto);
  }

  @Put(':code')
  @UseGuards(JwtGuard)
  async update(@Param('code') code: string, @Body() dto: { enabled: boolean }) {
    return this.languageService.update(code, dto);
  }
}
