-- AlterEnum
ALTER TYPE "TranslationStatus" ADD VALUE 'AI_TRANSLATED';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "aiProvider" TEXT NOT NULL DEFAULT 'gemini';
