"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { recordPayment, recordCustomerPayment, deleteSale } from "@/app/actions"
import { Trash2, MoreHorizontal } from "lucide-react"

interface Customer {
    id: string
    name: string
    phone: string
}

interface DebtSale {
    id: string
    created_at: string
    total_price: number
    amount_paid: number
    inventory: {
        name: string
    }
}

interface PaymentRecord {
    id: string
    created_at: string
    amount: number
    sales: {
        inventory: {
            name: string
        }
    }
}

export function DebtManager() {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [debts, setDebts] = useState<DebtSale[]>([])
    const [payments, setPayments] = useState<PaymentRecord[]>([])
    const [view, setView] = useState<'debts' | 'payments'>('debts')
    const [loading, setLoading] = useState(false)
    const [paymentAmount, setPaymentAmount] = useState<string>("")
    const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
    const [isCustomerPayment, setIsCustomerPayment] = useState(false)

    const supabase = createClient()

    const fetchCustomersWithDebt = async () => {
        // Fetch sales that are pending
        const { data: sales } = await supabase
            .from("sales")
            .select("customer_id, customers(id, name, phone)")
            .eq("status", "pending")
        
        if (sales) {
            const uniqueCustomers = new Map()
            sales.forEach(sale => {
                if (sale.customers) {
                    // @ts-ignore
                    uniqueCustomers.set(sale.customers.id, sale.customers)
                }
            })
            setCustomers(Array.from(uniqueCustomers.values()))
        }
    }

    const fetchCustomerDebts = async (customerId: string) => {
        const { data } = await supabase
            .from("sales")
            .select(`
                id, created_at, total_price, amount_paid,
                inventory(name)
            `)
            .eq("customer_id", customerId)
            .eq("status", "pending")
        
        if (data) {
            // @ts-ignore
            setDebts(data)
        }
    }

    const fetchCustomerPayments = async (customerId: string) => {
        const { data } = await supabase
            .from("payments")
            .select(`
                id, created_at, amount,
                sales!inner(
                    customer_id,
                    inventory(name)
                )
            `)
            .eq("sales.customer_id", customerId)
            .order("created_at", { ascending: false })
        
        if (data) {
            // @ts-ignore
            setPayments(data)
        }
    }

    const handlePayment = async () => {
        if (!paymentAmount) return
        
        setLoading(true)
        try {
            if (isCustomerPayment && selectedCustomer) {
                await recordCustomerPayment(selectedCustomer.id, parseFloat(paymentAmount))
            } else if (selectedSaleId) {
                await recordPayment(selectedSaleId, parseFloat(paymentAmount))
            }
            
            setPaymentDialogOpen(false)
            setPaymentAmount("")
            if (selectedCustomer) {
                fetchCustomerDebts(selectedCustomer.id)
                fetchCustomerPayments(selectedCustomer.id)
                fetchCustomersWithDebt() // Refresh list in case customer is fully paid
            }
        } catch (e: any) {
            console.error(e)
            alert(`Failed to record payment: ${e.message || "Unknown error"}`)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCustomersWithDebt()
    }, [])

    useEffect(() => {
        if (selectedCustomer) {
            fetchCustomerDebts(selectedCustomer.id)
            fetchCustomerPayments(selectedCustomer.id)
            setView('debts')
        }
    }, [selectedCustomer])

    const totalDebt = debts.reduce((sum, debt) => sum + (debt.total_price - (debt.amount_paid || 0)), 0)

    return (
        <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200 text-sm text-blue-800">
                <strong>How to add debt:</strong> To create a new debt record, go to the Inventory list, click "Record Sale" on a product, check "Sell on Credit", and select or create a customer.
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Customers with Debt</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {customers.length === 0 ? (
                            <p className="text-muted-foreground">No outstanding debts.</p>
                        ) : (
                            <div className="space-y-2">
                                {customers.map(customer => (
                                    <div 
                                        key={customer.id}
                                        className={`p-3 border rounded cursor-pointer hover:bg-accent ${selectedCustomer?.id === customer.id ? 'bg-accent' : ''}`}
                                        onClick={() => setSelectedCustomer(customer)}
                                    >
                                        <div className="font-medium">{customer.name}</div>
                                        <div className="text-sm text-muted-foreground">{customer.phone}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle>
                                {selectedCustomer ? selectedCustomer.name : "Select a Customer"}
                            </CardTitle>
                            {selectedCustomer && (
                                <div className="flex gap-2 text-sm">
                                    <button 
                                        onClick={() => setView('debts')}
                                        className={`hover:underline ${view === 'debts' ? 'font-bold text-primary' : 'text-muted-foreground'}`}
                                    >
                                        Outstanding Debts
                                    </button>
                                    <span className="text-muted-foreground">|</span>
                                    <button 
                                        onClick={() => setView('payments')}
                                        className={`hover:underline ${view === 'payments' ? 'font-bold text-primary' : 'text-muted-foreground'}`}
                                    >
                                        Payment History
                                    </button>
                                </div>
                            )}
                        </div>
                        {selectedCustomer && totalDebt > 0 && view === 'debts' && (
                            <Button 
                                size="sm" 
                                onClick={() => {
                                    setIsCustomerPayment(true)
                                    setSelectedSaleId(null)
                                    setPaymentDialogOpen(true)
                                }}
                            >
                                Pay Total Debt (₵{totalDebt.toFixed(2)})
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        {!selectedCustomer ? (
                            <p className="text-muted-foreground">Select a customer to view details.</p>
                        ) : view === 'debts' ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Item</TableHead>
                                        <TableHead>Owed</TableHead>
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {debts.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground">
                                                No outstanding debts.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        debts.map(debt => (
                                        <TableRow key={debt.id}>
                                            <TableCell>{new Date(debt.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell>{debt.inventory?.name}</TableCell>
                                            <TableCell className="text-red-500 font-bold">
                                                ₵{(debt.total_price - (debt.amount_paid || 0)).toFixed(2)}
                                            </TableCell>
                                            <TableCell className="flex gap-2 items-center">
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    onClick={() => {
                                                        setIsCustomerPayment(false)
                                                        setSelectedSaleId(debt.id)
                                                        setPaymentDialogOpen(true)
                                                    }}
                                                >
                                                    Pay Item
                                                </Button>
                                                
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            className="text-red-600 focus:text-red-600"
                                                            onClick={async () => {
                                                                if (confirm("Are you sure you want to delete this debt? This will restore the inventory.")) {
                                                                    await deleteSale(debt.id);
                                                                    if (selectedCustomer) {
                                                                        fetchCustomerDebts(selectedCustomer.id);
                                                                        fetchCustomersWithDebt();
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete Debt
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )))}
                                </TableBody>
                            </Table>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Item Paid For</TableHead>
                                        <TableHead>Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                                                No payments recorded.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        payments.map(payment => (
                                        <TableRow key={payment.id}>
                                            <TableCell>{new Date(payment.created_at).toLocaleDateString()} {new Date(payment.created_at).toLocaleTimeString()}</TableCell>
                                            <TableCell>{payment.sales?.inventory?.name || "Unknown Item"}</TableCell>
                                            <TableCell className="text-green-600 font-bold">
                                                ₵{payment.amount.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    )))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {isCustomerPayment ? `Record Payment for ${selectedCustomer?.name}` : "Record Item Payment"}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <label>Amount</label>
                                <Input 
                                    type="number" 
                                    value={paymentAmount} 
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    placeholder="0.00"
                                />
                                {isCustomerPayment && (
                                    <p className="text-xs text-muted-foreground">
                                        This payment will be applied to the oldest debts first.
                                    </p>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handlePayment} disabled={loading}>
                                {loading ? "Recording..." : "Confirm Payment"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    )
}