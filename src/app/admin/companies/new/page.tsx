import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CreateCompanyForm } from "./create-form";

export default async function NewCompanyPage() {
  await requireRole("ADMIN");
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/companies"
        className="mb-4 inline-block text-sm text-brand-600 hover:underline"
      >
        ← Back to companies
      </Link>
      <PageHeader
        title="Add a company"
        description="Manually create a carrier and its owner account."
      />
      <Card>
        <CardContent>
          <CreateCompanyForm />
        </CardContent>
      </Card>
    </div>
  );
}
