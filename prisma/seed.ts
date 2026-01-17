import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Categories and Divisions based on user requirements
const categoriesData = [
  {
    name: 'Benjamín',
    gender: 'MIXTO',
    divisions: [
      { name: '1ª Zonal', level: 1 },
      { name: 'Preferente', level: 2 },
      { name: 'Autonómico', level: 3 },
      { name: 'Campeonato 1ª Zonal', level: 4 },
      { name: 'Campeonato Preferente', level: 5 },
      { name: 'Campeonato Autonómico', level: 6 },
    ],
  },
  {
    name: 'Alevín',
    gender: 'FEMENINO',
    divisions: [
      { name: '1ª Zonal', level: 1 },
      { name: 'Preferente', level: 2 },
      { name: 'Autonómico', level: 3 },
      { name: 'Campeonato 1ª Zonal', level: 4 },
      { name: 'Campeonato Preferente', level: 5 },
      { name: 'Campeonato Autonómico', level: 6 },
    ],
  },
  {
    name: 'Alevín',
    gender: 'MASCULINO',
    divisions: [
      { name: 'Nivel 2ª Zonal', level: 1 },
      { name: 'Nivel 1ª Zonal', level: 2 },
      { name: 'Nivel Preferente', level: 3 },
      { name: 'Nivel Autonómico', level: 4 },
      { name: 'Campeonato 3ª Zonal', level: 5 },
      { name: 'Campeonato 2ª Zonal', level: 6 },
      { name: 'Campeonato 1ª Zonal', level: 7 },
      { name: 'Campeonato Preferente', level: 8 },
      { name: 'Campeonato Autonómico', level: 9 },
      { name: 'FAP Nivel Autonómico', level: 10 },
    ],
  },
  {
    name: 'Pre-Infantil',
    gender: 'FEMENINO',
    divisions: [
      { name: 'Nivel Autonómico', level: 1 },
      { name: 'Campeonato Preferente', level: 2 },
      { name: 'Campeonato Autonómico', level: 3 },
    ],
  },
  {
    name: 'Pre-Infantil',
    gender: 'MASCULINO',
    divisions: [
      { name: 'Nivel Preferente', level: 1 },
      { name: 'Nivel Autonómico', level: 2 },
      { name: 'Campeonato Preferente', level: 3 },
      { name: 'Campeonato Autonómico', level: 4 },
    ],
  },
  {
    name: 'Infantil',
    gender: 'FEMENINO',
    divisions: [
      { name: 'Nivel 1ª Zonal', level: 1 },
      { name: 'Nivel Preferente', level: 2 },
      { name: 'Nivel Autonómico', level: 3 },
      { name: 'Campeonato 2ª Zonal', level: 4 },
      { name: 'Campeonato 1ª Zonal', level: 5 },
      { name: 'Campeonato Preferente', level: 6 },
      { name: 'Campeonato Autonómico', level: 7 },
      { name: 'FAP Nivel Preferente', level: 8 },
    ],
  },
  {
    name: 'Infantil',
    gender: 'MASCULINO',
    divisions: [
      { name: 'Nivel 2ª Zonal', level: 1 },
      { name: 'Nivel 1ª Zonal', level: 2 },
      { name: 'Nivel Preferente', level: 3 },
      { name: 'Nivel Autonómico', level: 4 },
      { name: 'Campeonato 3ª Zonal', level: 5 },
      { name: 'Campeonato 2ª Zonal', level: 6 },
      { name: 'Campeonato 1ª Zonal', level: 7 },
      { name: 'Campeonato Preferente', level: 8 },
      { name: 'Campeonato Autonómico', level: 9 },
      { name: 'FAP Nivel 1ª Zonal', level: 10 },
    ],
  },
  {
    name: 'Cadete',
    gender: 'FEMENINO',
    divisions: [
      { name: 'Nivel 1ª Zonal', level: 1 },
      { name: 'Nivel Preferente', level: 2 },
      { name: 'Nivel Autonómico', level: 3 },
      { name: 'Campeonato 2ª Zonal', level: 4 },
      { name: 'Campeonato 1ª Zonal', level: 5 },
      { name: 'Campeonato Preferente', level: 6 },
      { name: 'Campeonato Autonómico', level: 7 },
      { name: 'FAP Nivel Preferente', level: 8 },
    ],
  },
  {
    name: 'Cadete',
    gender: 'MASCULINO',
    divisions: [
      { name: 'Nivel 2ª Zonal', level: 1 },
      { name: 'Nivel 1ª Zonal', level: 2 },
      { name: 'Nivel Preferente', level: 3 },
      { name: 'Nivel Autonómico', level: 4 },
      { name: 'Campeonato 3ª Zonal', level: 5 },
      { name: 'Campeonato 2ª Zonal', level: 6 },
      { name: 'Campeonato 1ª Zonal', level: 7 },
      { name: 'Campeonato Preferente', level: 8 },
      { name: 'Campeonato Autonómico', level: 9 },
      { name: 'FAP Nivel 1ª Zonal', level: 10 },
      { name: 'FAP Nivel Preferente', level: 11 },
      { name: 'FAP Nivel Autonómico', level: 12 },
    ],
  },
  {
    name: 'Junior',
    gender: 'FEMENINO',
    divisions: [
      { name: 'Nivel 1ª Zonal', level: 1 },
      { name: 'Nivel Preferente', level: 2 },
      { name: 'Nivel Autonómico', level: 3 },
      { name: 'Campeonato 1ª Zonal', level: 4 },
      { name: 'Campeonato Preferente', level: 5 },
      { name: 'Campeonato Autonómico', level: 6 },
      { name: 'FAP Nivel Autonómico', level: 7 },
    ],
  },
  {
    name: 'Junior',
    gender: 'MASCULINO',
    divisions: [
      { name: '1ª Zonal', level: 1 },
      { name: 'Preferente', level: 2 },
      { name: 'Nivel Autonómico', level: 3 },
      { name: 'Campeonato Autonómico', level: 4 },
      { name: 'Campeonato Descenso Autonómico', level: 5 },
      { name: 'FAP Nivel Autonómico', level: 6 },
      { name: 'FAP Preferente', level: 7 },
    ],
  },
];

// Default tariffs by category (can be adjusted by user)
const defaultTariffs = [
  { categoryName: 'Benjamín', gender: 'MIXTO', amount: 15 },
  { categoryName: 'Alevín', gender: 'FEMENINO', amount: 18 },
  { categoryName: 'Alevín', gender: 'MASCULINO', amount: 18 },
  { categoryName: 'Pre-Infantil', gender: 'FEMENINO', amount: 20 },
  { categoryName: 'Pre-Infantil', gender: 'MASCULINO', amount: 20 },
  { categoryName: 'Infantil', gender: 'FEMENINO', amount: 22 },
  { categoryName: 'Infantil', gender: 'MASCULINO', amount: 22 },
  { categoryName: 'Cadete', gender: 'FEMENINO', amount: 25 },
  { categoryName: 'Cadete', gender: 'MASCULINO', amount: 25 },
  { categoryName: 'Junior', gender: 'FEMENINO', amount: 28 },
  { categoryName: 'Junior', gender: 'MASCULINO', amount: 28 },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Create categories and divisions
  for (const categoryData of categoriesData) {
    const category = await prisma.category.upsert({
      where: {
        name_gender: {
          name: categoryData.name,
          gender: categoryData.gender,
        },
      },
      update: {},
      create: {
        name: categoryData.name,
        gender: categoryData.gender,
      },
    });

    console.log(`  ✅ Created category: ${categoryData.name} (${categoryData.gender})`);

    for (const divisionData of categoryData.divisions) {
      await prisma.division.upsert({
        where: {
          name_categoryId: {
            name: divisionData.name,
            categoryId: category.id,
          },
        },
        update: {
          level: divisionData.level,
        },
        create: {
          name: divisionData.name,
          level: divisionData.level,
          categoryId: category.id,
        },
      });
    }
    console.log(`     📋 Created ${categoryData.divisions.length} divisions`);
  }

  // Create default tariffs
  for (const tariff of defaultTariffs) {
    await prisma.tariff.upsert({
      where: {
        categoryName_gender_divisionName: {
          categoryName: tariff.categoryName,
          gender: tariff.gender,
          divisionName: '',
        },
      },
      update: {
        amount: tariff.amount,
      },
      create: {
        categoryName: tariff.categoryName,
        gender: tariff.gender,
        divisionName: null,
        amount: tariff.amount,
      },
    });
  }
  console.log('  ✅ Created default tariffs');

  // Create admin user
  const bcrypt = await import('bcryptjs');
  const adminPassword = await bcrypt.hash('admin123', 10);
  
  await prisma.user.upsert({
    where: { licenseNumber: 'ADMIN' },
    update: {},
    create: {
      licenseNumber: 'ADMIN',
      name: 'Administrador',
      password: adminPassword,
      refereeType: 'PISTA',
      role: 'ADMIN',
    },
  });
  console.log('  ✅ Created admin user (licenseNumber: ADMIN, password: admin123)');

  console.log('✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
