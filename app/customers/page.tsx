"use client"

import type React from "react"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, EyeOff, Search, UserPlus, Filter, Download, Lock, Shield, AlertTriangle } from "lucide-react"
import { maskSSN, maskAccountNumber, maskPhoneNumber, maskEmail, maskAddress } from "@/lib/masking-utils"

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  address: string
  ssn: string
  accountNumber: string
  creditScore: number | null
  loanAmount: number | null
  status: "active" | "inactive" | "pending"
  createdAt?: string
  updatedAt?: string
}

interface AuditLog {
  id: string
  timestamp: string
  action: string
  resourceType: string
  resourceId: string
  userId: string
  userName: string
  userRole: string
  details: string
  ipAddress: string
  userAgent: string
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

interface Loan {
  id: string;
  amount: string;
  purpose: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
}

export default function CustomersPage() {
  const { user, loading, getAccessToken } = useAuth()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showSensitiveData, setShowSensitiveData] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [customerAuditLogs, setCustomerAuditLogs] = useState<AuditLog[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogMode, setDialogMode] = useState<'view' | 'add' | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [newCustomerData, setNewCustomerData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    ssn: "",
    accountNumber: "",
    creditScore: null as number | null,
    loanAmount: null as number | null,
    status: "active" as "active" | "inactive" | "pending",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanForm, setLoanForm] = useState({ amount: "", purpose: "" });
  const [loanSubmitting, setLoanSubmitting] = useState(false);
  const [loanError, setLoanError] = useState<string | null>(null);
  const [loanSuccess, setLoanSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || (user.role !== "admin" && user.role !== "staff"))) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "staff")) {
      fetchCustomers()
    }
  }, [user])

  const fetchCustomers = async () => {
    setIsLoadingCustomers(true)
    setError(null)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error("No authentication token")
      const response = await fetch("/api/customers", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `HTTP error! status: ${response.status}`)
      }
      const result: ApiResponse<Customer[]> = await response.json()
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch customers")
      }
      if (!result.data || !Array.isArray(result.data)) {
        throw new Error("Invalid data format received")
      }
      setCustomers(result.data)
      setFilteredCustomers(result.data)
    } catch (err) {
      console.error("Fetch error:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
      setCustomers([])
      setFilteredCustomers([])
    } finally {
      setIsLoadingCustomers(false)
    }
  }

  useEffect(() => {
    let filtered = customers
    if (searchTerm) {
      filtered = filtered.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (customer.phone?.includes(searchTerm) ?? false)
      )
    }
    if (statusFilter) {
      filtered = filtered.filter((customer) => customer.status === statusFilter)
    }
    setFilteredCustomers(filtered)
  }, [searchTerm, statusFilter, customers])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleViewCustomer = async (customer: Customer) => {
    setDialogMode('view')
    setSelectedCustomer(customer)
    setShowSensitiveData(false)
    setIsDialogOpen(true)
    setIsLoadingLogs(true)
    // Fetch audit logs for this customer
    try {
      const response = await fetch(`/api/audit-logs?resourceId=${customer.id}&resourceType=CUSTOMER`)
      if (response.ok) {
        const data = await response.json()
        setCustomerAuditLogs(data.logs)
      } else {
        console.error("Failed to fetch customer audit logs")
      }
    } catch (error) {
      console.error("Error fetching customer audit logs:", error)
    } finally {
      setIsLoadingLogs(false)
    }
  }

  const toggleSensitiveData = async () => {
    setShowSensitiveData(!showSensitiveData)
  }

  const handleAddCustomerClick = () => {
    setDialogMode('add')
    setSelectedCustomer(null)
    setShowSensitiveData(false)
    setCustomerAuditLogs([])
    setIsDialogOpen(true)
  }

  const exportToCSV = () => {
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Status"
    ]
    const rows = filteredCustomers.map(c =>
      [c.name, c.email, c.phone, c.status].join(",")
    )
    const csvContent = [headers.join(","), ...rows].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "customers.csv"
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewCustomerData((prev) => ({ ...prev, [name]: value }))
  }

  const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewCustomerData((prev) => ({
      ...prev,
      [name]: value === "" ? null : Number(value),
    }))
  }

  const handleSubmitAddCustomer = async () => {
    setIsSubmitting(true)
    setFormError(null)
    setFormSuccess(null)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error("No authentication token")
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...newCustomerData,
          showSensitive: false,
        }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) {
        setFormError(result.error || "Failed to add customer")
        setFormSuccess(null)
        return
      }
      setFormSuccess(result.message || "Customer added successfully!")
      setFormError(null)
      setTimeout(() => {
        setNewCustomerData({
          name: "",
          email: "",
          password: "",
          phone: "",
          address: "",
          ssn: "",
          accountNumber: "",
          creditScore: null,
          loanAmount: null,
          status: "active",
        })
        setIsDialogOpen(false)
        setFormSuccess(null)
        fetchCustomers()
      }, 1200)
    } catch (err) {
      console.error("Add customer error:", err)
      setFormError(err instanceof Error ? err.message : "Failed to add customer")
      setFormSuccess(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const fetchLoans = useCallback(async () => {
    try {
      const res = await fetch("/api/loans");
      const data = await res.json();
      if (data.success) setLoans(data.data);
    } catch (e) {
      // ignore for now
    }
  }, []);

  useEffect(() => {
    if (user && user.role === "customer") fetchLoans();
  }, [user, fetchLoans]);

  const handleLoanInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLoanForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoanSubmitting(true);
    setLoanError(null);
    setLoanSuccess(null);
    try {
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loanForm),
      });
      const data = await res.json();
      if (data.success) {
        setLoanSuccess("Loan application submitted!");
        setLoanForm({ amount: "", purpose: "" });
        fetchLoans();
      } else {
        setLoanError(data.error || "Failed to apply for loan");
      }
    } catch (e) {
      setLoanError("Failed to apply for loan");
    } finally {
      setLoanSubmitting(false);
    }
  };

  if (loading || !user || isLoadingCustomers) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        {!isLoadingCustomers && error ? (
          <div className="text-red-500 dark:text-red-400 text-center">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3" />
            <p className="text-lg font-semibold">Error Loading Customers</p>
            <p className="text-sm">{error}</p>
            <Button variant="outline" className="mt-4" onClick={fetchCustomers}>Try Again</Button>
          </div>
        ) : (
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        )}
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Customer Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">View and manage customer information securely</p>
        </div>

        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border rounded px-2 py-1"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
          <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={exportToCSV}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          {user.role === "admin" && (
            <Button size="sm" className="flex items-center gap-2 bg-green-600 hover:bg-green-700" onClick={handleAddCustomerClick}>
              <UserPlus className="h-4 w-4" />
              Add Customer
            </Button>
          )}
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Customer Database</CardTitle>
          <CardDescription>All customer data is encrypted and access is logged for security purposes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input
                type="search"
                placeholder="Search customers..."
                className="pl-8"
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{maskEmail(customer.email)}</TableCell>
                    <TableCell>{maskPhoneNumber(customer.phone)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          customer.status === "active"
                            ? "default"
                            : customer.status === "inactive"
                              ? "secondary"
                              : "outline"
                        }
                        className={
                          customer.status === "active"
                            ? "bg-green-500"
                            : customer.status === "inactive"
                              ? "bg-gray-500"
                              : "bg-yellow-500"
                        }
                      >
                        {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleViewCustomer(customer)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCustomers.length === 0 && !isLoadingCustomers && !error && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      No customers found
                    </TableCell>
                  </TableRow>
                )}
                {customers.length > 0 && filteredCustomers.length === 0 && searchTerm && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      No customers match your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{dialogMode === 'add' ? 'Add New Customer' : 'Customer Details'}</DialogTitle>
            <DialogDescription>
              {dialogMode === 'add'
                ? 'Enter the details for the new customer.'
                : 'Viewing customer information. All access is logged for security purposes.'
              }
            </DialogDescription>
          </DialogHeader>

          {dialogMode === 'add' ? (
            <div className="space-y-4">
              {formError && (
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800 dark:text-red-400">{formError}</p>
                </div>
              )}
              {formSuccess && (
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md flex items-start gap-2">
                  <svg className="h-5 w-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <p className="text-sm text-green-800 dark:text-green-400">{formSuccess}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">Full Name</label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter full name"
                    value={newCustomerData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">Email</label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter email"
                    value={newCustomerData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">Password</label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter password"
                    value={newCustomerData.password}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium">Phone</label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="Enter phone number"
                    value={newCustomerData.phone}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label htmlFor="address" className="text-sm font-medium">Address</label>
                  <Input
                    id="address"
                    name="address"
                    placeholder="Enter address"
                    value={newCustomerData.address}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="ssn" className="text-sm font-medium">SSN</label>
                  <Input
                    id="ssn"
                    name="ssn"
                    placeholder="Enter SSN"
                    value={newCustomerData.ssn}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="accountNumber" className="text-sm font-medium">Account Number</label>
                  <Input
                    id="accountNumber"
                    name="accountNumber"
                    placeholder="Enter account number"
                    value={newCustomerData.accountNumber}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="creditScore" className="text-sm font-medium">Credit Score</label>
                  <Input
                    id="creditScore"
                    name="creditScore"
                    type="number"
                    placeholder="Enter credit score"
                    value={newCustomerData.creditScore || ""}
                    onChange={handleNumberInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="loanAmount" className="text-sm font-medium">Loan Amount</label>
                  <Input
                    id="loanAmount"
                    name="loanAmount"
                    type="number"
                    placeholder="Enter loan amount"
                    value={newCustomerData.loanAmount || ""}
                    onChange={handleNumberInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="status" className="text-sm font-medium">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={newCustomerData.status}
                    onChange={(e) => setNewCustomerData(prev => ({ ...prev, status: e.target.value as "active" | "inactive" | "pending" }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            selectedCustomer && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold dark:text-white">{selectedCustomer.name}</h3>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        selectedCustomer.status === "active"
                          ? "default"
                          : selectedCustomer.status === "inactive"
                            ? "secondary"
                            : "outline"
                      }
                      className={
                        selectedCustomer.status === "active"
                          ? "bg-green-500"
                          : selectedCustomer.status === "inactive"
                            ? "bg-gray-500"
                            : "bg-yellow-500"
                      }
                    >
                      {selectedCustomer.status.charAt(0).toUpperCase() + selectedCustomer.status.slice(1)}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={toggleSensitiveData} className="flex items-center gap-1">
                      {showSensitiveData ? (
                        <>
                          <EyeOff className="h-4 w-4" />
                          Hide Sensitive
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4" />
                          Show Sensitive
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <Tabs defaultValue="basic">
                  <TabsList className="mb-4">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="financial">Financial</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="activity">Activity Log</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                        <p className="dark:text-white">
                          {showSensitiveData ? selectedCustomer.email : maskEmail(selectedCustomer.email)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</p>
                        <p className="dark:text-white">
                          {showSensitiveData ? selectedCustomer.phone : maskPhoneNumber(selectedCustomer.phone)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</p>
                        <p className="dark:text-white">
                          {showSensitiveData ? selectedCustomer.address : maskAddress(selectedCustomer.address)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">SSN</p>
                          <Shield className="h-3 w-3 text-red-500" />
                        </div>
                        <p className="dark:text-white">
                          {showSensitiveData ? selectedCustomer.ssn : maskSSN(selectedCustomer.ssn)}
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="financial">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Account Number</p>
                          <Shield className="h-3 w-3 text-red-500" />
                        </div>
                        <p className="dark:text-white">
                          {showSensitiveData ? selectedCustomer.accountNumber : maskAccountNumber(selectedCustomer.accountNumber)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Credit Score</p>
                        <p className="dark:text-white">{selectedCustomer.creditScore}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loan Amount</p>
                        <p className="dark:text-white">
                          {selectedCustomer.loanAmount !== null && selectedCustomer.loanAmount !== undefined
                            ? `$${selectedCustomer.loanAmount.toLocaleString()}`
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="documents">
                    <div className="text-center py-8">
                      <Lock className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-500 dark:text-gray-400">
                        Document access requires additional authorization
                      </p>
                      <Button variant="outline" className="mt-4">
                        Request Access
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="activity">
                    {isLoadingLogs ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                      </div>
                    ) : customerAuditLogs.length > 0 ? (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Timestamp</TableHead>
                              <TableHead>User</TableHead>
                              <TableHead>Action</TableHead>
                              <TableHead>Details</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {customerAuditLogs.map((log) => (
                              <TableRow key={log.id}>
                                <TableCell className="whitespace-nowrap">
                                  {new Date(log.timestamp).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <span>{log.userName}</span>
                                    <Badge variant="outline" className="ml-1 text-xs">
                                      {log.userRole}
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={
                                      log.action === "VIEW"
                                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                        : log.action === "VIEW_SENSITIVE"
                                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
                                          : log.action === "UPDATE"
                                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                                    }
                                  >
                                    {log.action.replace("_", " ")}
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-xs truncate">{log.details}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500 dark:text-gray-400">No activity logs found for this customer</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                {showSensitiveData && (
                  <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-yellow-800 dark:text-yellow-400 font-medium">Sensitive Data Access</p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-500">
                        You are viewing sensitive customer information. This access has been logged for security and
                        compliance purposes.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          <DialogFooter>
            {dialogMode === 'add' ? (
              <>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700" 
                  onClick={handleSubmitAddCustomer}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Adding...
                    </>
                  ) : (
                    'Add Customer'
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Close</Button>
                {user.role === "admin" && <Button className="bg-green-600 hover:bg-green-700">Edit Customer</Button>}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Loan Application Section */}
      {user.role === "customer" && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Apply for a Loan</CardTitle>
            <CardDescription>Submit a new loan application</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLoanSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <Input name="amount" type="number" value={loanForm.amount} onChange={handleLoanInputChange} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Purpose</label>
                <textarea name="purpose" value={loanForm.purpose} onChange={handleLoanInputChange} required className="w-full border rounded px-2 py-1" />
              </div>
              {loanError && <div className="text-red-500 text-sm">{loanError}</div>}
              {loanSuccess && <div className="text-green-600 text-sm">{loanSuccess}</div>}
              <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={loanSubmitting}>
                {loanSubmitting ? "Submitting..." : "Apply"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Loan Status Section */}
      {user.role === "customer" && loans.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Loan Applications</CardTitle>
            <CardDescription>Track the status of your loan requests</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Approved By</TableHead>
                  <TableHead>Approved At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell>${loan.amount}</TableCell>
                    <TableCell>{loan.purpose}</TableCell>
                    <TableCell>
                      <Badge variant={loan.status === "approved" ? "default" : loan.status === "rejected" ? "secondary" : "outline"}>
                        {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(loan.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{loan.approvedBy || "-"}</TableCell>
                    <TableCell>{loan.approvedAt ? new Date(loan.approvedAt).toLocaleString() : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
