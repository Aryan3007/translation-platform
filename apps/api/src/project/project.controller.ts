import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ProjectService } from './project.service';
import { JwtGuard } from '../auth/jwt.guard';
import { CreateProjectDto } from '@translation-platform/shared';

@Controller('v1/projects')
@UseGuards(JwtGuard)
export class ProjectController {
  constructor(private projectService: ProjectService) {}

  @Post()
  async create(@Body() dto: CreateProjectDto) {
    return this.projectService.create(dto);
  }

  @Get()
  async findAll() {
    return this.projectService.findAll();
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: { aiEnabled?: boolean; aiProvider?: string },
  ) {
    return this.projectService.update(id, dto);
  }
}
