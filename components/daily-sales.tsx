"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { SaleActions } from "@/components/sale-actions";

interface DailySalesProps {
  userId?: string; // If provided, filter by this user
}

interface Sale {
    id: string;
    quantity: number;
    total_price: number;
    amount_paid: number;
    created_at: string;
    salesperson_id: string;
    inventory: {
        name: string;
        sku: string;
    };
}

export function DailySales({ userId }: DailySalesProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [salespersonMap, setSalespersonMap] = useState<Record<string, string>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchSales = async () => {
      setLoading(true);
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);

      let query = supabase
        .from("sales")
        .select(`
          id,
          quantity,
          total_price,
          amount_paid,
          created_at,
          salesperson_id,
          inventory (
            name,
            sku
          )
        `)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .order("created_at", { ascending: false });

      if (userId) {
        query = query.eq("salesperson_id", userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching sales:", error);
      } else {
        // @ts-ignore
        setSales(data || []);
        
        // Fetch salesperson names if needed
        if (!userId && data && data.length > 0) {
            const userIds = Array.from(new Set(data.map((s: any) => s.salesperson_id).filter(Boolean)));
            if (userIds.length > 0) {
                const { data: profiles } = await supabase
                .from("profiles")
                .select("id, full_name")
                .in("id", userIds);
                
                if (profiles) {
                    const map: Record<string, string> = {};
                    profiles.forEach((p: any) => {
                        map[p.id] = p.full_name || "Unknown";
                    });
                    setSalespersonMap(map);
                }
            }
        }
      }
      setLoading(false);
    };

    fetchSales();

    // Realtime subscription
    const channel = supabase
        .channel('sales_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
            fetchSales();
        })
        .subscribe();
    
    return () => {
        supabase.removeChannel(channel);
    };
  }, [selectedDate, userId]);

  const totalSales = sales.reduce((sum, sale) => sum + (sale.amount_paid || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
                <span>Sales Report</span>
                <Input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-auto"
                />
            </div>
            <span className="text-2xl font-bold text-green-600">
                ₵{totalSales.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">collected</span>
            </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Paid</TableHead>
              {!userId && <TableHead>Salesperson</TableHead>}
              {!userId && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
                <TableRow>
                    <TableCell colSpan={userId ? 5 : 7} className="text-center py-8">
                        Loading sales data...
                    </TableCell>
                </TableRow>
            ) : sales.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={userId ? 5 : 7} className="text-center text-muted-foreground py-8">
                        No sales recorded for this date.
                    </TableCell>
                </TableRow>
            ) : (
                sales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell>
                  {new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </TableCell>
                <TableCell>
                    <div className="font-medium">{sale.inventory?.name || "Unknown Product"}</div>
                    <div className="text-xs text-muted-foreground">{sale.inventory?.sku}</div>
                </TableCell>
                <TableCell>{sale.quantity}</TableCell>
                <TableCell>₵{sale.total_price.toFixed(2)}</TableCell>
                <TableCell className={sale.amount_paid < sale.total_price ? "text-red-500 font-bold" : "text-green-600"}>
                    ₵{sale.amount_paid?.toFixed(2)}
                </TableCell>
                {!userId && (
                    <TableCell>
                        {sale.salesperson_id === currentUserId 
                            ? "You (Manager)" 
                            : (salespersonMap[sale.salesperson_id] || "Unknown")}
                    </TableCell>
                )}
                {!userId && (
                    <TableCell>
                        <SaleActions saleId={sale.id} />
                    </TableCell>
                )}
              </TableRow>
            )))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

