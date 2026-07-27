import { requireCompanyOwner } from "@/lib/current";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { CompanySettingsForm } from "./settings-form";

export default async function CompanySettingsPage() {
  const { company } = await requireCompanyOwner();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Company Settings"
        description="Edit your company profile. Account status is managed by the platform admin."
        actions={<Badge tone={statusTone(company.status)}>{humanize(company.status)}</Badge>}
      />
      <Card>
        <CardHeader>
          <CardTitle>Company details</CardTitle>
        </CardHeader>
        <CardContent>
          <CompanySettingsForm
            name={company.name}
            dotNumber={company.dotNumber}
            mcNumber={company.mcNumber}
            phone={company.phone}
            address={company.address}
            city={company.city}
            state={company.state}
            zip={company.zip}
          />
        </CardContent>
      </Card>
    </div>
  );
}
