import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentCompany } from "@/lib/current";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime, toDateInput, initials } from "@/lib/utils";
import { DriverStatusActions } from "./status-actions";
import { DriverInfoForm } from "./info-form";
import { ExperienceVerification, type VerifEntry } from "./experience-verification";
import { AgreementsSection, type AgreementRow } from "./agreements-section";
import {
  FileSignature,
  ShieldCheck,
  FlaskConical,
  ClipboardCheck,
  CalendarClock,
  Truck,
  MessagesSquare,
} from "lucide-react";

export default async function DriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { companyId } = await getCurrentCompany("drivers");

  const driver = await prisma.driver.findFirst({
    where: { id, companyId },
    include: {
      user: true,
      documentAssignments: true,
      screenings: true,
      drugTests: true,
      clearinghouseQueries: true,
      appointments: true,
      truckAssignments: {
        where: { active: true },
        include: { truck: true, trailer: true },
      },
      experiences: {
        orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
      },
      agreements: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!driver) notFound();

  const agreementRows: AgreementRow[] = driver.agreements.map((a) => {
    const terms =
      a.compensationPercent
        ? `${a.compensationPercent}% of gross`
        : a.cpm
          ? `${a.cpm} CPM`
          : "Terms not set";
    return {
      id: a.id,
      status: a.status,
      token: a.token,
      contractorName: a.contractorName || `${driver.user.firstName} ${driver.user.lastName}`,
      terms,
      signedInfo: a.signedAt ? `Signed ${formatDateTime(a.signedAt)}` : a.sentAt ? `Sent ${formatDateTime(a.sentAt)}` : "",
      addedToDocuments: !!a.agreementDocumentId,
    };
  });

  const pendingDocs = driver.documentAssignments.filter((a) =>
    ["SENT", "VIEWED"].includes(a.status),
  ).length;
  const activeEquip = driver.truckAssignments[0];

  const modules = [
    {
      icon: FileSignature,
      label: "Documents",
      value: `${pendingDocs} pending`,
      href: `/company/drivers/${driver.id}/documents`,
    },
    {
      icon: ShieldCheck,
      label: "Screening (PSP/MVR)",
      value: `${driver.screenings.length} report(s)`,
      href: `/company/drivers/${driver.id}/screening`,
    },
    {
      icon: FlaskConical,
      label: "Drug Tests",
      value: `${driver.drugTests.length} test(s)`,
      href: `/company/drivers/${driver.id}/drug-tests`,
    },
    {
      icon: ClipboardCheck,
      label: "Clearinghouse",
      value: `${driver.clearinghouseQueries.length} query(ies)`,
      href: `/company/drivers/${driver.id}/clearinghouse`,
    },
    {
      icon: CalendarClock,
      label: "Orientation",
      value: `${driver.appointments.length} appt(s)`,
      href: `/company/drivers/${driver.id}/orientation`,
    },
    {
      icon: Truck,
      label: "Equipment",
      value: activeEquip?.truck
        ? `Truck ${activeEquip.truck.unitNumber}`
        : "None assigned",
      href: `/company/drivers/${driver.id}/equipment`,
    },
  ];

  return (
    <div>
      <Link href="/company/drivers" className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← Back to drivers
      </Link>
      <PageHeader
        title={`${driver.user.firstName} ${driver.user.lastName}`}
        description={driver.user.email}
        actions={
          <div className="flex items-center gap-3">
            <Badge tone={statusTone(driver.status)}>{humanize(driver.status)}</Badge>
            <Link href={`/company/messages/${driver.id}`}>
              <Button variant="outline">
                <MessagesSquare className="h-4 w-4" /> Message
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mb-6 flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700">
          {initials(driver.user.firstName, driver.user.lastName)}
        </span>
        <div className="flex-1">
          <div className="text-sm text-slate-500">
            Hire date: {formatDate(driver.hireDate)} · Applied: {formatDate(driver.createdAt)}
            {driver.terminationDate && ` · Terminated: ${formatDate(driver.terminationDate)}`}
          </div>
        </div>
        <DriverStatusActions driverId={driver.id} status={driver.status} />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <Link
            key={m.label}
            href={m.href}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-400 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <m.icon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-900">{m.label}</div>
              <div className="text-xs text-slate-500">{m.value}</div>
            </div>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Driver information</CardTitle>
        </CardHeader>
        <CardContent>
          <DriverInfoForm
            driverId={driver.id}
            phone={driver.user.phone}
            dateOfBirth={toDateInput(driver.dateOfBirth) || null}
            licenseNumber={driver.licenseNumber}
            licenseState={driver.licenseState}
            licenseClass={driver.licenseClass}
            licenseExpiry={toDateInput(driver.licenseExpiry) || null}
            address={driver.address}
            city={driver.city}
            state={driver.state}
            zip={driver.zip}
            emergencyContactName={driver.emergencyContactName}
            emergencyContactPhone={driver.emergencyContactPhone}
          />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Employment verification ({driver.experiences.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {driver.experiences.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">
              The driver hasn&apos;t added any employment history yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {driver.experiences.map((e) => {
                const entry: VerifEntry = {
                  id: e.id,
                  employerName: e.employerName,
                  position: e.position ?? "",
                  city: e.city ?? "",
                  state: e.state ?? "",
                  phone: e.phone ?? "",
                  email: e.email ?? "",
                  period: `${formatDate(e.startDate)} — ${e.isCurrent ? "Present" : formatDate(e.endDate)}`,
                  reasonForLeaving: e.reasonForLeaving ?? "",
                  status: e.verificationStatus,
                  method: e.verificationMethod ?? "",
                  notes: e.verificationNotes ?? "",
                  datesConfirmed: e.datesConfirmed,
                  eligibleForRehire: e.eligibleForRehire,
                  verifiedByName: e.verifiedByName ?? "",
                  verifiedAt: e.verifiedAt ? formatDateTime(e.verifiedAt) : "",
                  responderName: e.responderName ?? "",
                  responderTitle: e.responderTitle ?? "",
                  respondedAt: e.respondedAt ? formatDateTime(e.respondedAt) : "",
                  drugAlcoholViolation: e.drugAlcoholViolation,
                  dotRecordableAccident: e.dotRecordableAccident,
                  signature: e.responderSignature ?? "",
                  consentSigned: !!e.consentSignedAt,
                  confirmedDates: e.confirmedStartDate
                    ? `${formatDate(e.confirmedStartDate)} — ${e.confirmedEndDate ? formatDate(e.confirmedEndDate) : "Present"}`
                    : "",
                  dotAccidentDetails: e.dotAccidentDetails ?? "",
                  addedToDocuments: !!e.verificationDocumentId,
                };
                return <ExperienceVerification key={e.id} entry={entry} />;
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Agreements ({driver.agreements.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <AgreementsSection
            driverId={driver.id}
            driverName={`${driver.user.firstName} ${driver.user.lastName}`}
            driverEmail={driver.user.email}
            agreements={agreementRows}
          />
        </CardContent>
      </Card>
    </div>
  );
}
