import { getCurrentCompany } from "@/lib/current";
import { PageHeader } from "@/components/shell/page-header";
import { DriversTable } from "../drivers-table";
import { DriverTabs } from "../tabs";

export default async function PendingDriversPage() {
  const { companyId } = await getCurrentCompany("drivers");
  return (
    <div>
      <PageHeader
        title="Pending Drivers"
        description="Applicants and drivers still in the hiring process."
      />
      <DriverTabs />
      <DriversTable companyId={companyId} status="PENDING" />
    </div>
  );
}
