import { getCurrentCompany } from "@/lib/current";
import { PageHeader } from "@/components/shell/page-header";
import { DriversTable } from "./drivers-table";
import { DriverTabs } from "./tabs";

export default async function AllDriversPage() {
  const { companyId } = await getCurrentCompany("drivers");
  return (
    <div>
      <PageHeader
        title="All Drivers"
        description="Every driver associated with your company."
      />
      <DriverTabs />
      <DriversTable companyId={companyId} />
    </div>
  );
}
