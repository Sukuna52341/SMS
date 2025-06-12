"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Download, Filter, AlertTriangle, FileText, User, Shield } from "lucide-react"

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

export default function AuditLogsPage() {
  const { user, loading, getAccessToken } = useAuth() // Added getAccessToken
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [actionFilter, setActionFilter] = useState<string>("")
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [dateRange, setDateRange] = useState<{start: string, end: string}>({start: '', end: ''})
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && user.role === "admin") {
      fetchAuditLogs()
    }
  }, [user])

  const fetchAuditLogs = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const token = await getAccessToken() // Get the current access token
      if (!token) {
        throw new Error("No authentication token available")
      }

      const response = await fetch("/api/audit-logs", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          // Handle unauthorized (token might be expired)
          setError("Session expired. Please log in again.")
          router.push("/login")
          return
        }
        throw new Error(`Error: ${response.status}`)
      }

      const data = await response.json()
      setAuditLogs(data.logs)
      setFilteredLogs(data.logs)
    } catch (err) {
      console.error("Failed to fetch audit logs:", err)
      setError(err instanceof Error ? err.message : "Failed to load audit logs. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let filtered = auditLogs

    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          (log.userName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
          (log.details?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
          (log.resourceId?.toLowerCase() || "").includes(searchTerm.toLowerCase())
      )
    }

    if (actionFilter && actionFilter !== "ALL") {
      filtered = filtered.filter((log) => log.action === actionFilter)
    }

    if (dateRange.start) {
      filtered = filtered.filter((log) => new Date(log.timestamp) >= new Date(dateRange.start))
    }
    if (dateRange.end) {
      filtered = filtered.filter((log) => new Date(log.timestamp) <= new Date(dateRange.end + "T23:59:59"))
    }

    setFilteredLogs(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }, [searchTerm, actionFilter, auditLogs, dateRange])

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE)

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleActionFilter = (value: string) => {
    setActionFilter(value)
  }

  const exportLogsAsCSV = () => {
    if (filteredLogs.length === 0) return
    const headers = Object.keys(filteredLogs[0])
    const csvRows = [
      headers.join(","),
      ...filteredLogs.map((log: any) =>
        headers.map(h => `"${(log[h] ?? '').toString().replace(/"/g, '""')}"`).join(",")
      )
    ]
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "audit_logs.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Audit Logs</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Monitor and review all system activity for security and compliance
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-2">
          <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={() => setShowFilters(true)}>
            <Filter className="h-4 w-4" />
            Advanced Filters
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={exportLogsAsCSV}>
            <Download className="h-4 w-4" />
            Export Logs
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Advanced Filters</h2>
            <div className="mb-4">
              <label className="block mb-1">Start Date</label>
              <input
                type="date"
                className="w-full border rounded px-2 py-1"
                value={dateRange.start}
                onChange={e => setDateRange({...dateRange, start: e.target.value})}
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1">End Date</label>
              <input
                type="date"
                className="w-full border rounded px-2 py-1"
                value={dateRange.end}
                onChange={e => setDateRange({...dateRange, end: e.target.value})}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowFilters(false)}>Cancel</Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setShowFilters(false)
                  // Filtering will be handled in useEffect
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>System Activity Logs</CardTitle>
          <CardDescription>Comprehensive audit trail of all actions performed in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input
                type="search"
                placeholder="Search logs..."
                className="pl-8"
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
            <div className="w-full md:w-64">
              <Select value={actionFilter} onValueChange={handleActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Actions</SelectItem>
                  <SelectItem value="VIEW">View</SelectItem>
                  <SelectItem value="VIEW_SENSITIVE">View Sensitive</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                  <SelectItem value="LOGIN">Login</SelectItem>
                  <SelectItem value="FAILED_LOGIN">Failed Login</SelectItem>
                  <SelectItem value="EXPORT">Export</SelectItem>
                  <SelectItem value="PRIVACY_REQUEST">Privacy Request</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md text-center">
              <p className="text-red-800 dark:text-red-400">{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={fetchAuditLogs}>
                Try Again
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-gray-500" />
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
                                  : log.action === "DELETE"
                                    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                    : log.action === "LOGIN"
                                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                      : log.action === "FAILED_LOGIN"
                                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                        : log.action === "EXPORT"
                                          ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
                                          : log.action === "PRIVACY_REQUEST"
                                            ? "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300"
                                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                          }
                        >
                          {log.action.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {log.resourceType === "CUSTOMER" ? (
                            <User className="h-3 w-3 text-gray-500" />
                          ) : log.resourceType === "SYSTEM" ? (
                            <Shield className="h-3 w-3 text-gray-500" />
                          ) : log.resourceType === "REPORT" ? (
                            <FileText className="h-3 w-3 text-gray-500" />
                          ) : log.resourceType === "PRIVACY" ? (
                            <Shield className="h-3 w-3 text-gray-500" />
                          ) : (
                            <FileText className="h-3 w-3 text-gray-500" />
                          )}
                          <span>{log.resourceType?.toLowerCase() ?? ''}</span>
                          <span className="text-xs text-gray-500">({log.resourceId})</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{log.details}</TableCell>
                      <TableCell className="whitespace-nowrap">{log.ipAddress}</TableCell>
                    </TableRow>
                  ))}
                  {paginatedLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        No audit logs found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex justify-between items-center mt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length} logs
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Alerts</CardTitle>
          <CardDescription>Potential security issues detected from audit logs</CardDescription>
        </CardHeader>
        <CardContent>
          {/*
            TODO: Implement logic to detect security alerts from audit logs
            and fetch them from the backend. Display dynamic alerts here.
          */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md text-center text-blue-800 dark:text-blue-300">
            <p>Security alert detection and display is currently under development.</p>
            <p className="mt-1 text-sm">Real-time alerts based on audit log analysis will appear here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
