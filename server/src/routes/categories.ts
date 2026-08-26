import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res) => {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
  res.json(categories);
});

const categorySchema = z.object({ name: z.string().min(1) });

router.post("/", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Name is required" });
  try {
    const category = await prisma.category.create({ data: parsed.data });
    res.status(201).json(category);
  } catch {
    res.status(409).json({ error: "Category already exists" });
  }
});

router.put("/:id", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Name is required" });
  const category = await prisma.category.update({
    where: { id: Number(req.params.id) },
    data: parsed.data,
  });
  res.json(category);
});

router.delete("/:id", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  await prisma.category.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});

export default router;
