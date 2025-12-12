import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { DailySales } from "@/components/daily-sales";
import { ProductGrid } from "@/components/product-grid";
import { DebtManager } from "@/components/debt-manager";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default async function SalespersonDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/auth/login");
  }

  // Fetch inventory
  const { data: inventory } = await supabase.from("inventory").select("*");

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Sales Dashboard</h1>
        <div className="flex gap-2">
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline">Manage Debts</Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Debt Management</DialogTitle>
                    </DialogHeader>
                    <DebtManager />
                </DialogContent>
            </Dialog>

             <Button asChild variant="outline">
                <Link href="/dashboard/manager">View as Manager</Link>
            </Button>
            <form action="/auth/signout" method="post">
                <Button variant="destructive">Sign Out</Button>
            </form>
        </div>
      </div>

      <ProductGrid inventory={inventory || []} />

      <div className="mt-8">
        <DailySales />
      </div>
    </div>
  );
}
