"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RecordSaleButton } from "./record-sale-button";
import { Search } from "lucide-react";

export function ProductGrid({ inventory }: { inventory: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredInventory = inventory?.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products by name or SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredInventory.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle>{item.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">SKU: {item.sku}</span>
                <span className="font-bold">₵{item.price}</span>
              </div>
              <div className="text-sm mb-4">
                Available: <span className={item.quantity < 10 ? "text-red-500 font-bold" : ""}>{item.quantity}</span>
              </div>
              <RecordSaleButton product={item} />
            </CardContent>
          </Card>
        ))}
        {filteredInventory.length === 0 && (
            <div className="col-span-full text-center p-10 text-muted-foreground">
                No products found.
            </div>
        )}
      </div>
    </div>
  );
}
