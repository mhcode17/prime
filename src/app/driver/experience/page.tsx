import { prisma } from "@/lib/db";
import { getCurrentDriver } from "@/lib/current";
import { PageHeader, EmptyState } from "@/components/shell/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toDateInput } from "@/lib/utils";
import { AddExperienceForm, ExperienceItem, type ExpEntry } from "./experience-ui";

export default async function DriverExperiencePage() {
  const { driver } = await getCurrentDriver();

  const rows = await prisma.driverExperience.findMany({
    where: { driverId: driver.id },
    orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
  });

  const entries: ExpEntry[] = rows.map((r) => ({
    id: r.id,
    employerName: r.employerName,
    position: r.position ?? "",
    city: r.city ?? "",
    state: r.state ?? "",
    phone: r.phone ?? "",
    email: r.email ?? "",
    startDate: toDateInput(r.startDate),
    endDate: toDateInput(r.endDate),
    isCurrent: r.isCurrent,
    reasonForLeaving: r.reasonForLeaving ?? "",
  }));

  return (
    <div>
      <PageHeader
        title="Work Experience"
        description="Add your employment history — previous carriers and the dates you worked there."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {entries.length === 0 ? (
            <EmptyState
              title="No experience added yet"
              description="Use the form to add the carriers you've worked for."
            />
          ) : (
            entries.map((e) => <ExperienceItem key={e.id} entry={e} />)
          )}
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Add experience</CardTitle>
            </CardHeader>
            <CardContent>
              <AddExperienceForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
