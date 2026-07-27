// One-time, idempotent backfill to introduce Organizations over existing
// companies. Safe to run multiple times.
//   docker compose -f docker-compose.prod.yml exec app npx tsx prisma/backfill-orgs.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1) Give every company an organization.
  const companies = await prisma.company.findMany();
  for (const c of companies) {
    if (c.organizationId) continue;
    const org = await prisma.organization.create({ data: { name: c.name } });
    await prisma.company.update({
      where: { id: c.id },
      data: { organizationId: org.id },
    });
    console.log(`Company "${c.name}" -> org ${org.id}`);
  }

  // 2) Migrate company users to org membership / company membership.
  const users = await prisma.user.findMany({
    where: { role: "COMPANY", companyId: { not: null } },
    include: { company: true },
  });
  for (const u of users) {
    const orgId = u.company?.organizationId;
    if (!orgId || !u.companyId) continue;

    // Attach the user to the org.
    if (u.organizationId !== orgId) {
      await prisma.user.update({
        where: { id: u.id },
        data: { organizationId: orgId },
      });
    }

    if (u.companyRole === "OWNER") {
      // Owners become organization admins (full access to all org companies).
      if (!u.isOrgAdmin) {
        await prisma.user.update({
          where: { id: u.id },
          data: { isOrgAdmin: true },
        });
        console.log(`Owner ${u.email} -> org admin`);
      }
    } else {
      // Managers get an explicit membership to their company.
      await prisma.companyMembership.upsert({
        where: { userId_companyId: { userId: u.id, companyId: u.companyId } },
        update: { permissions: u.permissions },
        create: {
          userId: u.id,
          companyId: u.companyId,
          companyRole: "MANAGER",
          permissions: u.permissions,
        },
      });
      console.log(`Manager ${u.email} -> membership @ ${u.companyId}`);
    }
  }

  console.log("Backfill complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
