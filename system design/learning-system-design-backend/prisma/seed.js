const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
      mobile: '+919876543210',
    },
  });

  console.log('✅ Admin user created:', admin.email);

  // Create sales users
  const salesPassword = await bcrypt.hash('sales123', 10);
  const sales1 = await prisma.user.upsert({
    where: { email: 'sales1@example.com' },
    update: {},
    create: {
      email: 'sales1@example.com',
      password: salesPassword,
      name: 'Rajesh Kumar',
      role: 'SALES',
      mobile: '+919876543211',
    },
  });

  const sales2 = await prisma.user.upsert({
    where: { email: 'sales2@example.com' },
    update: {},
    create: {
      email: 'sales2@example.com',
      password: salesPassword,
      name: 'Priya Sharma',
      role: 'SALES',
      mobile: '+919876543212',
    },
  });

  console.log('✅ Sales users created');

  // Create sample products
  const products = [
    {
      sku: 'UNI-001',
      name: 'Corporate Uniform Shirt',
      description: 'Premium quality corporate uniform shirt',
      category: 'SHIRT',
      fabric: 'Cotton Blend',
      colors: ['White', 'Blue', 'Black'],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      moq: 50,
      basePrice: 450.00,
      stockQuantity: 500,
      customizable: true,
      thumbnail: '/images/shirt-1.jpg',
      images: ['/images/shirt-1.jpg', '/images/shirt-2.jpg'],
    },
    {
      sku: 'UNI-002',
      name: 'Formal Pant',
      description: 'Comfortable formal pant for uniforms',
      category: 'PANT',
      fabric: 'Polyester',
      colors: ['Black', 'Navy', 'Grey'],
      sizes: ['28', '30', '32', '34', '36', '38', '40'],
      moq: 50,
      basePrice: 650.00,
      stockQuantity: 300,
      customizable: true,
      thumbnail: '/images/pant-1.jpg',
      images: ['/images/pant-1.jpg'],
    },
    {
      sku: 'UNI-003',
      name: 'School Uniform Set',
      description: 'Complete school uniform with shirt and pant',
      category: 'UNIFORM',
      fabric: 'Cotton',
      colors: ['Blue', 'White'],
      sizes: ['S', 'M', 'L', 'XL'],
      moq: 100,
      basePrice: 850.00,
      stockQuantity: 200,
      customizable: true,
      thumbnail: '/images/uniform-1.jpg',
      images: ['/images/uniform-1.jpg'],
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: product,
    });
  }

  console.log('✅ Sample products created');

  // Create sample leads
  const sampleLeads = [
    {
      companyName: 'ABC Hotel Group',
      contactPerson: 'Amit Patel',
      mobile: '+919876540001',
      whatsapp: '+919876540001',
      email: 'amit@abchotel.com',
      city: 'Ahmedabad',
      state: 'Gujarat',
      industry: 'Hospitality',
      requirement: 'Hotel staff uniforms',
      productInterest: 'Uniform Set',
      quantity: 200,
      budget: 150000,
      source: 'WEBSITE',
      status: 'NEW',
      priority: 'HIGH',
      salesPersonId: sales1.id,
    },
    {
      companyName: 'XYZ School',
      contactPerson: 'Neha Desai',
      mobile: '+919876540002',
      whatsapp: '+919876540002',
      email: 'neha@xyzschool.com',
      city: 'Mumbai',
      state: 'Maharashtra',
      industry: 'Education',
      requirement: 'School uniforms for 500 students',
      productInterest: 'School Uniform',
      quantity: 500,
      budget: 400000,
      source: 'INDIAMART',
      status: 'CONTACTED',
      priority: 'HOT',
      salesPersonId: sales1.id,
    },
    {
      companyName: 'Tech Solutions Pvt Ltd',
      contactPerson: 'Vikram Singh',
      mobile: '+919876540003',
      email: 'vikram@techsolutions.com',
      city: 'Bangalore',
      state: 'Karnataka',
      industry: 'IT',
      requirement: 'Corporate uniform for security staff',
      productInterest: 'Security Uniform',
      quantity: 50,
      budget: 50000,
      source: 'WHATSAPP',
      status: 'REQUIREMENT',
      priority: 'MEDIUM',
      salesPersonId: sales2.id,
    },
  ];

  for (const lead of sampleLeads) {
    await prisma.lead.create({
      data: lead,
    });
  }

  console.log('✅ Sample leads created');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
