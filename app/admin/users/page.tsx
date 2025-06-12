"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, UserPlus, Filter, CheckCircle, XCircle } from "lucide-react"

// Define proper types for our user data
interface User {
  id: string
  name: string
  email: string
  role: "admin" | "staff" | "customer"
  status: "active" | "inactive" | "pending"
}

export default function UsersPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isUpdating, setIsUpdating] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filterRole, setFilterRole] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "customer", status: "active" })
  const [showAddUser, setShowAddUser] = useState(false)

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetch("/api/users")
        if (response.ok) {
          const data = await response.json()
          setUsers(data.users)
          setFilteredUsers(data.users)
        }
      } catch (error) {
        console.error("Error loading users:", error)
      }
    }

    if (user && user.role === "admin") {
      loadUsers()
    }
  }, [user])

  useEffect(() => {
    let filtered = users
    if (searchTerm) {
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.role.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    if (filterRole) {
      filtered = filtered.filter(u => u.role === filterRole)
    }
    if (filterStatus) {
      filtered = filtered.filter(u => u.status === filterStatus)
    }
    setFilteredUsers(filtered)
  }, [searchTerm, users, filterRole, filterStatus])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleApproveUser = async (userId: string, userName: string) => {
    if (isUpdating) return

    setIsUpdating(true)

    try {
      const response = await fetch(`/api/users/${userId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "active" as const }),
      })

      if (response.ok) {
        // Update local state
        setUsers((prevUsers) => prevUsers.map((u) => (u.id === userId ? { ...u, status: "active" as const } : u)))
        setFilteredUsers((prevUsers) =>
          prevUsers.map((u) => (u.id === userId ? { ...u, status: "active" as const } : u)),
        )
      }
    } catch (error) {
      console.error("Error approving user:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRejectUser = async (userId: string, userName: string) => {
    if (isUpdating) return

    setIsUpdating(true)

    try {
      const response = await fetch(`/api/users/${userId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "inactive" as const }),
      })

      if (response.ok) {
        // Update local state
        setUsers((prevUsers) => prevUsers.map((u) => (u.id === userId ? { ...u, status: "inactive" as const } : u)))
        setFilteredUsers((prevUsers) =>
          prevUsers.map((u) => (u.id === userId ? { ...u, status: "inactive" as const } : u)),
        )
      }
    } catch (error) {
      console.error("Error rejecting user:", error)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAddUser = async () => {
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(prev => [...prev, data.user])
        setShowAddUser(false)
        setNewUser({ name: "", email: "", role: "customer", status: "active" })
      } else {
        // Optionally handle error
        alert("Failed to add user.")
      }
    } catch (err) {
      alert("Failed to add user.")
    }
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
          <h1 className="text-3xl font-bold dark:text-white">User Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage user accounts and permissions</p>
        </div>

        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-2">
          <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={() => setShowFilters(true)}>
            <Filter className="h-4 w-4" />
            Filter
          </Button>
          <Button size="sm" className="flex items-center gap-2 bg-green-600 hover:bg-green-700" onClick={() => setShowAddUser(true)}>
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Advanced Filters</h2>
            <div className="mb-4">
              <label className="block mb-1">Role</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
              >
                <option value="">All</option>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
                <option value="customer">Customer</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block mb-1">Status</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowFilters(false)}>Cancel</Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowFilters(false)}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}

      {showAddUser && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Add User</h2>
            <div className="mb-4">
              <label className="block mb-1">Name</label>
              <input
                className="w-full border rounded px-2 py-1"
                value={newUser.name}
                onChange={e => setNewUser({ ...newUser, name: e.target.value })}
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1">Email</label>
              <input
                className="w-full border rounded px-2 py-1"
                value={newUser.email}
                onChange={e => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1">Role</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={newUser.role}
                onChange={e => setNewUser({ ...newUser, role: e.target.value })}
              >
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
                <option value="customer">Customer</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block mb-1">Status</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={newUser.status}
                onChange={e => setNewUser({ ...newUser, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddUser(false)}>Cancel</Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleAddUser}
              >
                Add
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>User Accounts</CardTitle>
          <CardDescription>Manage all user accounts in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input
                type="search"
                placeholder="Search users..."
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
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          user.role === "admin"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
                            : user.role === "staff"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                              : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                        }
                      >
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.status === "active" ? "default" : user.status === "inactive" ? "secondary" : "outline"
                        }
                        className={
                          user.status === "active"
                            ? "bg-green-500"
                            : user.status === "inactive"
                              ? "bg-gray-500"
                              : "bg-yellow-500"
                        }
                      >
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {user.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1 text-green-600 border-green-600 hover:bg-green-50"
                            onClick={() => handleApproveUser(user.id, user.name)}
                            disabled={isUpdating}
                          >
                            <CheckCircle className="h-3 w-3" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1 text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => handleRejectUser(user.id, user.name)}
                            disabled={isUpdating}
                          >
                            <XCircle className="h-3 w-3" />
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
