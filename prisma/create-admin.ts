// Create (or update) the platform admin in production without seeding demo data.
// Usage on the server:
//   docker compose -f docker-compose.prod.yml exec \
//     -e ADMIN_EMAIL=you@example.com -e ADMIN_PASSWORD='strong-pass' \
//     app npx tsx prisma/create-admin.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("ADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { passwordHash, role: "ADMIN", isActive: true },
    create: {
      email: email.toLowerCase(),
      passwordHash,
      role: "ADMIN",
      firstName: "Platform",
      lastName: "Admin",
    },
  });
  console.log(`Admin ready: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
