"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { recordSale, createCustomer } from "@/app/actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"

interface Product {
    id: string
    name: string
    price: number
    quantity: number
}

interface Customer {
    id: string
    name: string
}

export function RecordSaleButton({ product }: { product: Product }) {
    const [open, setOpen] = useState(false)
    const [quantity, setQuantity] = useState(1)
    const [loading, setLoading] = useState(false)
    const [isCredit, setIsCredit] = useState(false)
    const [customers, setCustomers] = useState<Customer[]>([])
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("")
    const [amountPaid, setAmountPaid] = useState<string>("")
    
    // New customer form
    const [isNewCustomer, setIsNewCustomer] = useState(false)
    const [newCustomerName, setNewCustomerName] = useState("")
    const [newCustomerPhone, setNewCustomerPhone] = useState("")

    const supabase = createClient()

    useEffect(() => {
        if (open && isCredit) {
            fetchCustomers()
        }
    }, [open, isCredit])

    const fetchCustomers = async () => {
        const { data } = await supabase.from("customers").select("id, name").order("name")
        if (data) setCustomers(data)
    }

    const handleSale = async () => {
        if (quantity <= 0) return;
        if (quantity > product.quantity) {
            alert("Not enough stock");
            return;
        }

        setLoading(true)
        try {
            let customerId = selectedCustomerId

            if (isCredit) {
                if (isNewCustomer) {
                    if (!newCustomerName) {
                        alert("Please enter customer name")
                        setLoading(false)
                        return
                    }
                    const newCustomer = await createCustomer(newCustomerName, newCustomerPhone)
                    customerId = newCustomer.id
                } else if (!customerId) {
                    alert("Please select a customer")
                    setLoading(false)
                    return
                }
            }

            const paid = isCredit ? (parseFloat(amountPaid) || 0) : (product.price * quantity)

            await recordSale(product.id, quantity, product.price, customerId || undefined, paid)
            setOpen(false)
            setQuantity(1)
            setIsCredit(false)
            setAmountPaid("")
            setSelectedCustomerId("")
            setIsNewCustomer(false)
            setNewCustomerName("")
        } catch (e: any) {
            console.error(e);
            alert(`Failed to record sale: ${e.message || "Unknown error"}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full" disabled={product.quantity <= 0}>
                    {product.quantity > 0 ? "Record Sale" : "Out of Stock"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Record Sale: {product.name}</DialogTitle>
                    <DialogDescription>
                        Enter the quantity sold. Current stock: {product.quantity}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="quantity" className="text-right">
                            Quantity
                        </Label>
                        <Input
                            id="quantity"
                            type="number"
                            min="1"
                            max={product.quantity}
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value))}
                            className="col-span-3"
                        />
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox 
                            id="credit" 
                            checked={isCredit} 
                            onCheckedChange={(c) => setIsCredit(!!c)} 
                        />
                        <Label htmlFor="credit">Sell on Credit / Partial Payment</Label>
                    </div>

                    {isCredit && (
                        <>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Customer</Label>
                                <div className="col-span-3">
                                    {!isNewCustomer ? (
                                        <div className="flex gap-2">
                                            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Customer" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {customers.map(c => (
                                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button variant="outline" size="icon" onClick={() => setIsNewCustomer(true)} title="New Customer">
                                                +
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Input 
                                                placeholder="Name" 
                                                value={newCustomerName} 
                                                onChange={e => setNewCustomerName(e.target.value)} 
                                            />
                                            <Input 
                                                placeholder="Phone" 
                                                value={newCustomerPhone} 
                                                onChange={e => setNewCustomerPhone(e.target.value)} 
                                            />
                                            <Button variant="ghost" size="sm" onClick={() => setIsNewCustomer(false)}>
                                                Cancel
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="paid" className="text-right">
                                    Paid Now
                                </Label>
                                <Input
                                    id="paid"
                                    type="number"
                                    min="0"
                                    value={amountPaid}
                                    onChange={(e) => setAmountPaid(e.target.value)}
                                    placeholder="0.00"
                                    className="col-span-3"
                                />
                            </div>
                        </>
                    )}

                    <div className="text-sm text-muted-foreground text-right">
                        Total: ₵{(quantity * product.price).toFixed(2)}
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSale} disabled={loading}>
                        {loading ? "Recording..." : "Confirm Sale"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
