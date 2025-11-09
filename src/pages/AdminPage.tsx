import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
export function AdminPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <Card>
          <CardHeader>
            <CardTitle>Admin Panel</CardTitle>
            <CardDescription>
              This section is for administrative tasks. Full functionality will be implemented in a future phase.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Here you will be able to manage disputes, adjust ledgers, and view reports.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}