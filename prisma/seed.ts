import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

async function main() {
  console.log("Seeding…");

  const pw = await hash("password123");

  // ── Admin ──────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: "admin@truckingcrm.com" },
    update: {},
    create: {
      email: "admin@truckingcrm.com",
      passwordHash: pw,
      role: "ADMIN",
      firstName: "Platform",
      lastName: "Admin",
    },
  });

  // ── Company 1 (active) ─────────────────────────────────
  const acme = await prisma.company.upsert({
    where: { dotNumber: "1234567" },
    update: {},
    create: {
      name: "Acme Freight LLC",
      dotNumber: "1234567",
      mcNumber: "MC-987654",
      status: "ACTIVE",
      city: "Dallas",
      state: "TX",
      phone: "(214) 555-0100",
      staff: {
        create: {
          email: "manager@acmefreight.com",
          passwordHash: pw,
          role: "COMPANY",
          companyRole: "OWNER",
          firstName: "Maria",
          lastName: "Gonzalez",
          phone: "(214) 555-0101",
        },
      },
    },
  });

  // ── Company 2 (pending approval) ───────────────────────
  await prisma.company.upsert({
    where: { dotNumber: "7654321" },
    update: {},
    create: {
      name: "Blue Ridge Carriers",
      dotNumber: "7654321",
      status: "PENDING",
      city: "Knoxville",
      state: "TN",
      staff: {
        create: {
          email: "owner@blueridge.com",
          passwordHash: pw,
          role: "COMPANY",
          companyRole: "OWNER",
          firstName: "Tom",
          lastName: "Baker",
        },
      },
    },
  });

  // ── Drivers for Acme ───────────────────────────────────
  const driverSeed = [
    { first: "John", last: "Smith", email: "john.driver@example.com", status: "ACTIVE" as const },
    { first: "Carlos", last: "Rivera", email: "carlos.driver@example.com", status: "PENDING" as const },
    { first: "Dwayne", last: "Johnson", email: "dwayne.driver@example.com", status: "PENDING" as const },
    { first: "Mike", last: "Brown", email: "mike.driver@example.com", status: "TERMINATED" as const },
  ];

  const drivers = [];
  for (const d of driverSeed) {
    const user = await prisma.user.upsert({
      where: { email: d.email },
      update: {},
      create: {
        email: d.email,
        passwordHash: pw,
        role: "DRIVER",
        firstName: d.first,
        lastName: d.last,
        phone: "(555) 010-2000",
        driverProfile: {
          create: {
            companyId: acme.id,
            status: d.status,
            licenseNumber: "TX" + Math.floor(1000000 + Math.random() * 8999999),
            licenseState: "TX",
            licenseClass: "A",
            dateOfBirth: new Date("1988-03-22"),
            address: "1200 Trucker Way",
            city: "Dallas",
            state: "TX",
            zip: "75201",
            hireDate: d.status === "ACTIVE" ? new Date("2025-01-15") : null,
            terminationDate: d.status === "TERMINATED" ? new Date("2025-06-01") : null,
          },
        },
      },
      include: { driverProfile: true },
    });
    if (user.driverProfile) drivers.push(user.driverProfile);
  }

  // ── Equipment ──────────────────────────────────────────
  await prisma.truck.createMany({
    data: [
      { companyId: acme.id, unitNumber: "T-101", make: "Freightliner", model: "Cascadia", year: 2022, status: "AVAILABLE" },
      { companyId: acme.id, unitNumber: "T-102", make: "Volvo", model: "VNL", year: 2021, status: "AVAILABLE" },
    ],
    skipDuplicates: true,
  });
  await prisma.trailer.createMany({
    data: [
      { companyId: acme.id, unitNumber: "TR-201", type: "Dry Van", year: 2020, status: "AVAILABLE" },
      { companyId: acme.id, unitNumber: "TR-202", type: "Reefer", year: 2023, status: "AVAILABLE" },
    ],
    skipDuplicates: true,
  });

  // ── A document assigned to a pending driver ────────────
  const pendingDriver = drivers.find((d) => d.status === "PENDING");
  if (pendingDriver) {
    const doc = await prisma.document.create({
      data: {
        companyId: acme.id,
        title: "Employment Agreement",
        description: "Standard company driver employment agreement.",
        fileType: "text/plain",
        content:
          "EMPLOYMENT AGREEMENT\n\nThis agreement is entered into between Acme Freight LLC and the driver. By signing below, the driver agrees to the terms of employment, safety policies, and company handbook.",
      },
    });
    await prisma.documentAssignment.create({
      data: { documentId: doc.id, driverId: pendingDriver.id, status: "SENT" },
    });

    // Open orientation slots
    const base = new Date();
    base.setDate(base.getDate() + 3);
    base.setHours(9, 0, 0, 0);
    await prisma.appointment.createMany({
      data: [0, 1, 2].map((i) => {
        const start = new Date(base);
        start.setDate(base.getDate() + i);
        const end = new Date(start);
        end.setHours(start.getHours() + 2);
        return {
          companyId: acme.id,
          type: "ORIENTATION" as const,
          status: "OPEN" as const,
          startsAt: start,
          endsAt: end,
          location: "Acme HQ — Dallas, TX",
        };
      }),
    });
  }

  // ── A manager for Acme with limited permissions ────────
  await prisma.user.upsert({
    where: { email: "dispatch@acmefreight.com" },
    update: {},
    create: {
      email: "dispatch@acmefreight.com",
      passwordHash: pw,
      role: "COMPANY",
      companyRole: "MANAGER",
      companyId: acme.id,
      firstName: "Dana",
      lastName: "Dispatch",
      permissions: ["drivers", "messages", "appointments"],
    },
  });

  // ── A sample support ticket from Acme ──────────────────
  const owner = await prisma.user.findUnique({
    where: { email: "manager@acmefreight.com" },
  });
  const existingTicket = await prisma.supportTicket.findFirst({
    where: { companyId: acme.id },
  });
  if (owner && !existingTicket) {
    await prisma.supportTicket.create({
      data: {
        companyId: acme.id,
        createdById: owner.id,
        subject: "How do I bulk-import drivers?",
        priority: "NORMAL",
        status: "OPEN",
        messages: {
          create: {
            senderId: owner.id,
            fromAdmin: false,
            body: "Hi, we're onboarding 20 drivers this week — is there a way to import them in bulk rather than one by one?",
          },
        },
      },
    });
  }

  console.log("Seed complete.");
  console.log("Logins (password: password123):");
  console.log("  Admin:    admin@truckingcrm.com");
  console.log("  Company:  manager@acmefreight.com");
  console.log("  Driver:   carlos.driver@example.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
