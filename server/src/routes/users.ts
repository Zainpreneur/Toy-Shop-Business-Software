import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

router.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  res.json(users);
});

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]).default("STAFF"),
});

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { name, email, password, role } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
    res.status(201).json(user);
  } catch {
    res.status(409).json({ error: "Email already in use" });
  }
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

router.put("/:id", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { password, ...rest } = parsed.data;
  const data: any = { ...rest };
  if (password) data.passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.update({
    where: { id: Number(req.params.id) },
    data,
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  });
  res.json(user);
});

router.delete("/:id", async (req, res) => {
  await prisma.user.update({ where: { id: Number(req.params.id) }, data: { active: false } });
  res.status(204).end();
});

export default router;
