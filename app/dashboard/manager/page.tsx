import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { InventoryManager } from "@/components/inventory-manager";
import { UserManager } from "@/components/user-manager";
import { DailySales } from "@/components/daily-sales";
import { DebtManager } from "@/components/debt-manager";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default async function ManagerDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/auth/login");
  }

  // Fetch current user profile
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Protect the route: Redirect salespersons to their dashboard
  if (currentProfile?.role === 'salesperson') {
      return redirect("/dashboard/salesperson");
  }

  // Fetch inventory
  const { data: inventory } = await supabase.from("inventory").select("*").order('created_at', { ascending: false });
  
  // Fetch users (profiles) - fetch all except current user
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .neq('id', user.id);

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
  }

  const sortedProfiles = profiles?.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "")) || [];

  // Calculate stats
  const productCount = inventory?.length || 0;
  const lowStockCount = inventory?.filter((i) => i.quantity < 10).length || 0;
  const totalValue = inventory?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0;
  const pendingUsersCount = sortedProfiles.filter((p) => !p.verified).length || 0;

  return (
    <div className="flex flex-col gap-6 p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold">Manager Dashboard</h1>
            <p className="text-sm text-muted-foreground">
                Logged in as: <span className="font-medium text-foreground">{currentProfile?.full_name}</span> 
                <span className="mx-2">•</span>
                Role: <span className={`font-medium ${currentProfile?.role === 'manager' || !currentProfile?.role ? 'text-green-600' : 'text-red-500'}`}>
                    {currentProfile?.role || 'Developer (No Role)'}
                </span>
            </p>
        </div>
        <div className="flex gap-2">
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline" className={pendingUsersCount > 0 ? "border-red-500 text-red-600 hover:text-red-700 hover:bg-red-50" : ""}>
                        Manage Users
                        {pendingUsersCount > 0 && (
                            <span className="ml-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                                {pendingUsersCount}
                            </span>
                        )}
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>User Management</DialogTitle>
                    </DialogHeader>
                    <UserManager users={sortedProfiles} />
                </DialogContent>
            </Dialog>

            <Button asChild variant="outline">
                <Link href="/dashboard/salesperson">View as Salesperson</Link>
            </Button>
            <form action="/auth/signout" method="post">
                <Button variant="destructive">Sign Out</Button>
            </form>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">Items with &lt; 10 qty</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₵{totalValue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8">
        <InventoryManager inventory={inventory || []} />
      </div>

      <DailySales />

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Debt Management</h2>
        <DebtManager />
      </div>
    </div>
  );
}
