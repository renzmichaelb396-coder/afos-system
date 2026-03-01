import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const email = process.argv[2] || process.env.SEED_ADMIN_EMAIL;

if (!email) {
  console.log("Seed: SEED_ADMIN_EMAIL not set; skipping admin promotion.");
  await prisma.$disconnect();
  process.exit(0);
}

const user = await prisma.user.findUnique({ where: { email } });

if (!user) {
  console.log("Seed: user not found; skipping admin promotion:", email);
  await prisma.$disconnect();
  process.exit(0);
}

await prisma.user.update({
  where: { email },
  data: { role: "ADMIN" },
});

console.log("OK: promoted to ADMIN:", email);

await prisma.$disconnect();
