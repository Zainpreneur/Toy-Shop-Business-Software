import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("admin123", 10);
  const staffPassword = await bcrypt.hash("staff123", 10);

  await prisma.user.upsert({
    where: { email: "admin@toyshop.com" },
    update: {},
    create: {
      name: "Alex Admin",
      email: "admin@toyshop.com",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "staff@toyshop.com" },
    update: {},
    create: {
      name: "Sam Staff",
      email: "staff@toyshop.com",
      passwordHash: staffPassword,
      role: "STAFF",
    },
  });

  const categoryNames = ["Action Figures", "Board Games", "Building Blocks", "Dolls", "Educational", "Outdoor", "Plush Toys", "Puzzles", "Remote Control", "Arts & Crafts"];
  const categories: Record<string, number> = {};
  for (const name of categoryNames) {
    const c = await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
    categories[name] = c.id;
  }

  const supplierData = [
    { name: "Bright Bricks Co.", contactName: "Dana Lee", email: "sales@brightbricks.example", phone: "555-0101" },
    { name: "Wonder Toys Wholesale", contactName: "Marcus Ito", email: "orders@wondertoys.example", phone: "555-0102" },
    { name: "Plushville Imports", contactName: "Priya Nair", email: "hello@plushville.example", phone: "555-0103" },
  ];
  const suppliers: Record<string, number> = {};
  for (const s of supplierData) {
    const existing = await prisma.supplier.findFirst({ where: { name: s.name } });
    const created = existing ?? (await prisma.supplier.create({ data: s }));
    suppliers[s.name] = created.id;
  }

  const productData = [
    { sku: "AF-001", name: "Galactic Hero Action Figure", category: "Action Figures", supplier: "Wonder Toys Wholesale", price: 14.99, costPrice: 6.5, stockQty: 42, reorderLevel: 10, ageRange: "5+" },
    { sku: "BG-001", name: "Kingdom Quest Board Game", category: "Board Games", supplier: "Wonder Toys Wholesale", price: 29.99, costPrice: 14, stockQty: 18, reorderLevel: 5, ageRange: "8+" },
    { sku: "BB-001", name: "Mega Block Castle Set (350pc)", category: "Building Blocks", supplier: "Bright Bricks Co.", price: 39.99, costPrice: 19, stockQty: 25, reorderLevel: 8, ageRange: "6+" },
    { sku: "BB-002", name: "Junior Builder Starter Set", category: "Building Blocks", supplier: "Bright Bricks Co.", price: 19.99, costPrice: 9, stockQty: 60, reorderLevel: 15, ageRange: "3+" },
    { sku: "DL-001", name: "Sunny Meadow Doll House", category: "Dolls", supplier: "Wonder Toys Wholesale", price: 49.99, costPrice: 24, stockQty: 12, reorderLevel: 5, ageRange: "4+" },
    { sku: "ED-001", name: "Alphabet Learning Tablet", category: "Educational", supplier: "Wonder Toys Wholesale", price: 24.99, costPrice: 11, stockQty: 30, reorderLevel: 10, ageRange: "2+" },
    { sku: "OU-001", name: "Rocket Launch Water Blaster", category: "Outdoor", supplier: "Plushville Imports", price: 12.99, costPrice: 5, stockQty: 55, reorderLevel: 15, ageRange: "6+" },
    { sku: "PL-001", name: "Cuddle Bear Plush (Large)", category: "Plush Toys", supplier: "Plushville Imports", price: 17.99, costPrice: 7.5, stockQty: 8, reorderLevel: 10, ageRange: "0+" },
    { sku: "PL-002", name: "Sleepy Fox Plush (Small)", category: "Plush Toys", supplier: "Plushville Imports", price: 9.99, costPrice: 4, stockQty: 70, reorderLevel: 20, ageRange: "0+" },
    { sku: "PZ-001", name: "World Map 500pc Puzzle", category: "Puzzles", supplier: "Wonder Toys Wholesale", price: 15.99, costPrice: 7, stockQty: 22, reorderLevel: 8, ageRange: "10+" },
    { sku: "RC-001", name: "Turbo Racer RC Car", category: "Remote Control", supplier: "Bright Bricks Co.", price: 44.99, costPrice: 22, stockQty: 4, reorderLevel: 6, ageRange: "8+" },
    { sku: "AC-001", name: "Deluxe Painting Studio Kit", category: "Arts & Crafts", supplier: "Plushville Imports", price: 21.99, costPrice: 9, stockQty: 33, reorderLevel: 10, ageRange: "5+" },
  ];

  const products: Record<string, number> = {};
  for (const p of productData) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        name: p.name,
        price: p.price,
        costPrice: p.costPrice,
        stockQty: p.stockQty,
        reorderLevel: p.reorderLevel,
        ageRange: p.ageRange,
        categoryId: categories[p.category],
        supplierId: suppliers[p.supplier],
      },
    });
    products[p.sku] = product.id;
  }

  const customerData = [
    { name: "Jamie Rivera", email: "jamie.rivera@example.com", phone: "555-0201" },
    { name: "Taylor Chen", email: "taylor.chen@example.com", phone: "555-0202" },
    { name: "Morgan Patel", email: "morgan.patel@example.com", phone: "555-0203" },
  ];
  const customers: number[] = [];
  for (const c of customerData) {
    const existing = await prisma.customer.findFirst({ where: { email: c.email } });
    const created = existing ?? (await prisma.customer.create({ data: c }));
    customers.push(created.id);
  }

  const admin = await prisma.user.findUnique({ where: { email: "admin@toyshop.com" } });
  const existingOrders = await prisma.order.count();
  if (existingOrders === 0 && admin) {
    const sampleOrders = [
      { customerId: customers[0], skus: [["AF-001", 2], ["PZ-001", 1]] },
      { customerId: customers[1], skus: [["BB-001", 1], ["PL-002", 3]] },
      { customerId: null, skus: [["OU-001", 4]] },
      { customerId: customers[2], skus: [["DL-001", 1], ["AC-001", 2]] },
    ] as const;

    let i = 0;
    for (const o of sampleOrders) {
      const items = o.skus.map(([sku, qty]) => ({ sku, qty }));
      let subtotal = 0;
      const createdItems = [];
      for (const item of items) {
        const p = productData.find((pd) => pd.sku === item.sku)!;
        const lineTotal = p.price * item.qty;
        subtotal += lineTotal;
        createdItems.push({ productId: products[item.sku], quantity: item.qty, unitPrice: p.price, lineTotal });
      }
      const daysAgo = i * 2;
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);

      await prisma.order.create({
        data: {
          orderNumber: `TS-SEED-${(i + 1).toString().padStart(4, "0")}`,
          customerId: o.customerId,
          userId: admin.id,
          status: "PAID",
          paymentMethod: "CASH",
          subtotal,
          discount: 0,
          tax: Number((subtotal * 0.07).toFixed(2)),
          total: Number((subtotal * 1.07).toFixed(2)),
          createdAt,
          items: { create: createdItems },
        },
      });
      i++;
    }
  }

  console.log("Seed complete.");
  console.log("Login with: admin@toyshop.com / admin123  or  staff@toyshop.com / staff123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
