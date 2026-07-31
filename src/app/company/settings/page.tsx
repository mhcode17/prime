import { requireCompanyOwner } from "@/lib/current";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, humanize, statusTone } from "@/components/ui/badge";
import { CompanySettingsForm } from "./settings-form";
import { LogoSettings } from "./logo-settings";

export default async function CompanySettingsPage() {
  const { company } = await requireCompanyOwner();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Company Settings"
        description="Edit your company profile. Account status is managed by the platform admin."
        actions={<Badge tone={statusTone(company.status)}>{humanize(company.status)}</Badge>}
      />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Company logo</CardTitle>
        </CardHeader>
        <CardContent>
          <LogoSettings
            logoSrc={company.logo ? `/api/company/${company.id}/logo?v=${company.updatedAt.getTime()}` : null}
          />
        </CardContent>
      </Card>
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
            email={company.email}
            website={company.website}
            faxNumber={company.faxNumber}
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
