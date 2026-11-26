import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12 || password === "replace-before-first-run") {
    throw new Error("Set BOOTSTRAP_ADMIN_EMAIL and a unique BOOTSTRAP_ADMIN_PASSWORD (minimum 12 characters) before seeding.");
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name: "Sanora Administrator", email, passwordHash, role: UserRole.SUPER_ADMIN }
  });
  console.log("Bootstrap administrator is ready. Store credentials securely and rotate the password after first sign-in.");
}
main().finally(() => prisma.$disconnect());
