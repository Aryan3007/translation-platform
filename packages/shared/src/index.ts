import { z } from 'zod';

// Register Key DTO (SDK -> API)
export const RegisterKeySchema = z.object({
  key: z.string().min(1, 'Key is required'),
  namespace: z.string().default('common'),
  defaultValue: z.string().min(1, 'Default value is required'),
});
export type RegisterKeyDto = z.infer<typeof RegisterKeySchema>;

// Update Translation DTO (Dashboard -> API)
export const UpdateTranslationSchema = z.object({
  keyId: z.string().uuid('Invalid Key ID'),
  languageCode: z.string().min(2, 'Language code must be at least 2 characters'),
  translatedValue: z.string(),
  status: z.enum(['TRANSLATED', 'MISSING', 'OUTDATED']).default('TRANSLATED'),
});
export type UpdateTranslationDto = z.infer<typeof UpdateTranslationSchema>;

// Create Project DTO
export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
});
export type CreateProjectDto = z.infer<typeof CreateProjectSchema>;

// Create Language DTO
export const CreateLanguageSchema = z.object({
  code: z.string().min(2, 'Language code is required').max(10),
  name: z.string().min(1, 'Language name is required'),
  enabled: z.boolean().default(true),
});
export type CreateLanguageDto = z.infer<typeof CreateLanguageSchema>;

// Model interfaces
export interface Project {
  id: string;
  name: string;
  apiKey: string;
  aiEnabled: boolean;
  aiProvider: string;
  createdAt: Date;
}

export interface Language {
  code: string;
  name: string;
  enabled: boolean;
}

export interface TranslationKey {
  id: string;
  projectId: string;
  key: string;
  namespace: string;
  defaultValue: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Translation {
  id: string;
  translationKeyId: string;
  languageCode: string;
  translatedValue: string;
  status: 'TRANSLATED' | 'MISSING' | 'OUTDATED';
  updatedAt: Date;
}

export type TranslationsBundle = Record<string, string>;
export type TranslationsGridItem = {
  id: string;
  key: string;
  namespace: string;
  defaultValue: string;
  translations: Record<string, {
    id: string;
    translatedValue: string;
    status: 'TRANSLATED' | 'MISSING' | 'OUTDATED' | 'AI_TRANSLATED';
  }>;
};
