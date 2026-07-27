import { getCurrentCompany } from "@/lib/current";
import { PageHeader } from "@/components/shell/page-header";
import { DriversTable } from "../drivers-table";
import { DriverTabs } from "../tabs";

export default async function TerminatedDriversPage() {
  const { companyId } = await getCurrentCompany("drivers");
  return (
    <div>
      <PageHeader
        title="Terminated Drivers"
        description="Drivers who are no longer with your company."
      />
      <DriverTabs />
      <DriversTable companyId={companyId} status="TERMINATED" />
    </div>
  );
}
