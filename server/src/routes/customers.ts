import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim();
  const customers = await prisma.customer.findMany({
    where: q
      ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { phone: { contains: q } }] }
      : undefined,
    include: { _count: { select: { orders: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(customers);
});

router.get("/:id", async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      orders: {
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  res.json(customer);
});

const customerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

router.post("/", async (req, res) => {
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const customer = await prisma.customer.create({ data: parsed.data });
  res.status(201).json(customer);
});

router.put("/:id", async (req, res) => {
  const parsed = customerSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const customer = await prisma.customer.update({
    where: { id: Number(req.params.id) },
    data: parsed.data,
  });
  res.json(customer);
});

router.delete("/:id", requireRole("ADMIN", "MANAGER"), async (req, res) => {
  await prisma.customer.delete({ where: { id: Number(req.params.id) } });
  res.status(204).end();
});

export default router;
