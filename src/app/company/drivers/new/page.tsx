import Link from "next/link";
import { getCurrentCompany } from "@/lib/current";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CreateDriverForm } from "./create-driver-form";

export default async function NewDriverPage() {
  const { company } = await getCurrentCompany("drivers");
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/company/drivers" className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← Back to drivers
      </Link>
      <PageHeader
        title="Add a driver"
        description={`Create a driver account under ${company.name}. They can sign in with the email and password you set.`}
      />
      <Card>
        <CardContent>
          <CreateDriverForm />
        </CardContent>
      </Card>
    </div>
  );
}
