import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from '@translation-platform/shared';

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProjectDto) {
    const existing = await this.prisma.project.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException('Project with this name already exists');
    }

    return this.prisma.project.create({
      data: {
        name: dto.name,
      },
    });
  }

  async findAll() {
    return this.prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, dto: { aiEnabled?: boolean; aiProvider?: string }) {
    return this.prisma.project.update({
      where: { id },
      data: {
        aiEnabled: dto.aiEnabled,
        aiProvider: dto.aiProvider,
      },
    });
  }
}
