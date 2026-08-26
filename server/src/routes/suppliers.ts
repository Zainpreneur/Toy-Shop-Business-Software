import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim();
  const suppliers = await prisma.supplier.findMany({
    where: q
      ? { OR: [{ name: { contains: q } }, { contactName: { contains: q } }] }
      : undefined,
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
  res.json(suppliers);
});

router.get("/:id", async (req, res) => {
  const supplier = await prisma.supplier.findUnique({
    where: { id: Number(req.params.id) },
    include: { products: true },
  });
  if (!supplier) return res.status(404).json({ error: "Supplier not found" });
  res.json(supplier);
});

const supplierSchema = z.object({
  name: z.string().min(1),
  contactName: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

router.post("/", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  const parsed = supplierSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const supplier = await prisma.supplier.create({ data: parsed.data });
  res.status(201).json(supplier);
});

router.put("/:id", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  const parsed = supplierSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const supplier = await prisma.supplier.update({
    where: { id: Number(req.params.id) },
    data: parsed.data,
  });
  res.json(supplier);
});

router.delete("/:id", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  await prisma.supplier.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});

export default router;
