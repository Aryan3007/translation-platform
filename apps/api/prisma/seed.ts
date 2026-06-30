import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create default admin user
  const email = 'admin@translations.com';
  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
    },
  });
  console.log('Admin user created (admin@translations.com / admin123)');

  // 2. Create languages
  const languages = [
    { code: 'en', name: 'English', enabled: true },
    { code: 'de', name: 'German', enabled: true },
    { code: 'fr', name: 'French', enabled: true },
  ];

  for (const lang of languages) {
    await prisma.language.upsert({
      where: { code: lang.code },
      update: { name: lang.name, enabled: lang.enabled },
      create: lang,
    });
  }
  console.log('Languages seeded: en, de, fr');

  // 3. Create default project
  const project = await prisma.project.upsert({
    where: { name: 'Klarwein' },
    update: {},
    create: {
      name: 'Klarwein',
      apiKey: 'klarwein-test-api-key-12345',
    },
  });
  console.log(`Default project Klarwein created with API Key: ${project.apiKey}`);

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
