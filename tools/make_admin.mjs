import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const email = process.argv[2];
if (!email) {
  console.error("usage: node scripts/make_admin.mjs <email>");
  process.exit(1);
}

const u = await prisma.user.update({
  where: { email },
  data: { role: "ADMIN" },
  select: { id: true, email: true, role: true },
});

console.log(u);
await prisma.$disconnect();
