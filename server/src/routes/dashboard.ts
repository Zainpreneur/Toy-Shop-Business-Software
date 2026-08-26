import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/summary", async (_req, res) => {
  const [productCount, customerCount, supplierCount, orders] = await Promise.all([
    prisma.product.count({ where: { active: true } }),
    prisma.customer.count(),
    prisma.supplier.count(),
    prisma.order.findMany({
      where: { status: { in: ["PAID"] } },
      include: { items: true },
    }),
  ]);

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = orders.length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todaysOrders = orders.filter((o) => o.createdAt >= today);
  const todaysRevenue = todaysOrders.reduce((sum, o) => sum + o.total, 0);

  const products = await prisma.product.findMany({ where: { active: true } });
  const lowStockCount = products.filter((p) => p.stockQty <= p.reorderLevel).length;

  res.json({
    productCount,
    customerCount,
    supplierCount,
    totalRevenue: Number(totalRevenue.toFixed(2)),
    totalOrders,
    todaysRevenue: Number(todaysRevenue.toFixed(2)),
    todaysOrderCount: todaysOrders.length,
    lowStockCount,
  });
});

router.get("/sales-trend", async (req, res) => {
  const days = req.query.days ? Number(req.query.days) : 14;
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const orders = await prisma.order.findMany({
    where: { status: "PAID", createdAt: { gte: since } },
    select: { createdAt: true, total: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const order of orders) {
    const key = order.createdAt.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) || 0) + order.total);
  }

  res.json(Array.from(buckets.entries()).map(([date, revenue]) => ({ date, revenue: Number(revenue.toFixed(2)) })));
});

router.get("/top-products", async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 5;
  const items = await prisma.orderItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true, lineTotal: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  res.json(
    items.map((i) => ({
      product: productMap.get(i.productId),
      totalSold: i._sum.quantity || 0,
      totalRevenue: Number((i._sum.lineTotal || 0).toFixed(2)),
    }))
  );
});

router.get("/low-stock", async (_req, res) => {
  const products = await prisma.product.findMany({
    where: { active: true },
    include: { category: true, supplier: true },
  });
  res.json(products.filter((p) => p.stockQty <= p.reorderLevel).sort((a, b) => a.stockQty - b.stockQty));
});

export default router;
