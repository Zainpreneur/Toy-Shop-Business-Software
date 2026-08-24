import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim();
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
  const lowStock = req.query.lowStock === "true";
  const activeOnly = req.query.activeOnly !== "false";

  const products = await prisma.product.findMany({
    where: {
      ...(activeOnly ? { active: true } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { sku: { contains: q } },
              { description: { contains: q } },
            ],
          }
        : {}),
    },
    include: { category: true, supplier: true },
    orderBy: { name: "asc" },
  });

  const filtered = lowStock ? products.filter((p) => p.stockQty <= p.reorderLevel) : products;
  res.json(filtered);
});

router.get("/:id", async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      category: true,
      supplier: true,
      stockMovements: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

const productSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  ageRange: z.string().optional().nullable(),
  costPrice: z.number().min(0).default(0),
  price: z.number().min(0),
  stockQty: z.number().int().min(0).default(0),
  reorderLevel: z.number().int().min(0).default(5),
  imageUrl: z.string().optional().nullable(),
  categoryId: z.number().int().optional().nullable(),
  supplierId: z.number().int().optional().nullable(),
  active: z.boolean().optional(),
});

router.post("/", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  try {
    const product = await prisma.product.create({ data: parsed.data });
    if (product.stockQty > 0) {
      await prisma.stockMovement.create({
        data: { productId: product.id, type: "RESTOCK", quantity: product.stockQty, note: "Initial stock" },
      });
    }
    res.status(201).json(product);
  } catch {
    res.status(409).json({ error: "SKU already exists" });
  }
});

router.put("/:id", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const product = await prisma.product.update({
    where: { id: Number(req.params.id) },
    data: parsed.data,
  });
  res.json(product);
});

router.delete("/:id", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  await prisma.product.update({ where: { id: Number(req.params.id) }, data: { active: false } });
  res.status(204).end();
});

const stockAdjustSchema = z.object({
  quantity: z.number().int(),
  type: z.enum(["RESTOCK", "ADJUSTMENT", "RETURN"]),
  note: z.string().optional().nullable(),
});

router.post("/:id/stock", requireRole("ADMIN", "MANAGER", "STAFF"), async (req, res) => {
  const parsed = stockAdjustSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { quantity, type, note } = parsed.data;
  const productId = Number(req.params.id);

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return res.status(404).json({ error: "Product not found" });

  const newQty = product.stockQty + quantity;
  if (newQty < 0) return res.status(400).json({ error: "Resulting stock cannot be negative" });

  const [updated] = await prisma.$transaction([
    prisma.product.update({ where: { id: productId }, data: { stockQty: newQty } }),
    prisma.stockMovement.create({ data: { productId, type, quantity, note } }),
  ]);

  res.json(updated);
});

export default router;
