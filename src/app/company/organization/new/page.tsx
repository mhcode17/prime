import Link from "next/link";
import { requireOrgAdmin } from "@/lib/current";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CreateCompanyForm } from "./create-company-form";

export default async function NewOrgCompanyPage() {
  await requireOrgAdmin();
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/company/organization" className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← Back to companies
      </Link>
      <PageHeader
        title="Add a company"
        description="Create another company under your organization. You'll have full access to it."
      />
      <Card>
        <CardContent>
          <CreateCompanyForm />
        </CardContent>
      </Card>
    </div>
  );
}
