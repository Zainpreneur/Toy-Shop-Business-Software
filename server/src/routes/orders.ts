import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const status = req.query.status as string | undefined;
  const customerId = req.query.customerId ? Number(req.query.customerId) : undefined;
  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...(customerId ? { customerId } : {}),
    },
    include: {
      customer: true,
      user: { select: { id: true, name: true } },
      items: { include: { product: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(orders);
});

router.get("/:id", async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      customer: true,
      user: { select: { id: true, name: true } },
      items: { include: { product: true } },
    },
  });
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
});

const orderItemSchema = z.object({
  productId: z.number().int(),
  quantity: z.number().int().min(1),
});

const orderSchema = z.object({
  customerId: z.number().int().optional().nullable(),
  paymentMethod: z.enum(["CASH", "CARD", "ONLINE", "OTHER"]).default("CASH"),
  discount: z.number().min(0).default(0),
  taxRate: z.number().min(0).max(1).default(0),
  notes: z.string().optional().nullable(),
  status: z.enum(["PENDING", "PAID"]).default("PAID"),
  items: z.array(orderItemSchema).min(1),
});

async function generateOrderNumber() {
  const count = await prisma.order.count();
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `TS-${datePart}-${(count + 1).toString().padStart(4, "0")}`;
}

router.post("/", async (req, res) => {
  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { customerId, paymentMethod, discount, taxRate, notes, status, items } = parsed.data;

  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) return res.status(400).json({ error: `Product ${item.productId} not found` });
    if (product.stockQty < item.quantity) {
      return res.status(400).json({ error: `Insufficient stock for ${product.name} (have ${product.stockQty}, need ${item.quantity})` });
    }
  }

  const subtotal = items.reduce((sum, item) => {
    const product = productMap.get(item.productId)!;
    return sum + product.price * item.quantity;
  }, 0);
  const discountedSubtotal = Math.max(subtotal - discount, 0);
  const tax = Number((discountedSubtotal * taxRate).toFixed(2));
  const total = Number((discountedSubtotal + tax).toFixed(2));
  const orderNumber = await generateOrderNumber();

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        customerId: customerId ?? undefined,
        userId: req.user!.id,
        status,
        paymentMethod,
        subtotal,
        discount,
        tax,
        total,
        notes,
        items: {
          create: items.map((item) => {
            const product = productMap.get(item.productId)!;
            return {
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: product.price,
              lineTotal: Number((product.price * item.quantity).toFixed(2)),
            };
          }),
        },
      },
      include: { items: { include: { product: true } }, customer: true },
    });

    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQty: { decrement: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: "SALE",
          quantity: -item.quantity,
          note: `Order ${orderNumber}`,
        },
      });
    }

    return created;
  });

  res.status(201).json(order);
});

const statusSchema = z.object({ status: z.enum(["PENDING", "PAID", "REFUNDED", "CANCELLED"]) });

router.patch("/:id/status", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid status" });
  const orderId = Number(req.params.id);

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return res.status(404).json({ error: "Order not found" });

  const updated = await prisma.$transaction(async (tx) => {
    if (parsed.data.status === "REFUNDED" && order.status !== "REFUNDED") {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQty: { increment: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: "RETURN",
            quantity: item.quantity,
            note: `Refund for ${order.orderNumber}`,
          },
        });
      }
    }
    return tx.order.update({ where: { id: orderId }, data: { status: parsed.data.status } });
  });

  res.json(updated);
});

export default router;
