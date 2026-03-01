import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const email = process.argv[2];
if (!email) {
  console.error("usage: node scripts/whoami_role.mjs <email>");
  process.exit(1);
}

const u = await prisma.user.findUnique({
  where: { email },
  select: { id: true, email: true, role: true },
});

console.log(u);
await prisma.$disconnect();
