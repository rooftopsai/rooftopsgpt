"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import {
  IconSearch,
  IconPlus,
  IconFilter,
  IconPhone,
  IconMail,
  IconMapPin,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconEye,
  IconChevronLeft,
  IconChevronRight,
  IconX,
  IconLoader2
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { CustomerModal } from "@/components/crm/customer-modal"
import { CustomerDetailPanel } from "@/components/crm/customer-detail-panel"

export interface Customer {
  id: string
  workspaceId: string
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  status: CustomerStatus
  source?: CustomerSource
  tags?: string[]
  createdAt: string
  updatedAt: string
}

export type CustomerStatus =
  | "lead"
  | "prospect"
  | "customer"
  | "inactive"
  | "do_not_contact"

export type CustomerSource =
  | "web_form"
  | "referral"
  | "home_advisor"
  | "angi"
  | "storm_lead"
  | "door_knock"
  | "cold_call"
  | "google"
  | "facebook"
  | "other"

const statusColors: Record<CustomerStatus, string> = {
  lead: "bg-blue-100 text-blue-700",
  prospect: "bg-yellow-100 text-yellow-700",
  customer: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-700",
  do_not_contact: "bg-red-100 text-red-700"
}

const statusLabels: Record<CustomerStatus, string> = {
  lead: "Lead",
  prospect: "Prospect",
  customer: "Customer",
  inactive: "Inactive",
  do_not_contact: "Do Not Contact"
}

const sourceLabels: Record<CustomerSource, string> = {
  web_form: "Web Form",
  referral: "Referral",
  home_advisor: "HomeAdvisor",
  angi: "Angi",
  storm_lead: "Storm Lead",
  door_knock: "Door Knock",
  cold_call: "Cold Call",
  google: "Google",
  facebook: "Facebook",
  other: "Other"
}

export default function CustomersPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const workspaceId = params.workspaceid as string

  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | "all">("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [showModal, setShowModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showDetailPanel, setShowDetailPanel] = useState(false)

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams({
        workspaceId,
        page: page.toString(),
        pageSize: "20"
      })

      if (search) queryParams.set("search", search)
      if (statusFilter !== "all") queryParams.set("status", statusFilter)

      const response = await fetch(`/api/crm/customers?${queryParams}`)
      if (response.ok) {
        const data = await response.json()
        setCustomers(data.customers || [])
        setTotal(data.total || 0)
        setTotalPages(Math.ceil((data.total || 0) / 20))
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error)
    } finally {
      setLoading(false)
    }
  }, [workspaceId, page, search, statusFilter])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setShowModal(true)
      setEditingCustomer(null)
    }
  }, [searchParams])

  const handleCreateCustomer = () => {
    setEditingCustomer(null)
    setShowModal(true)
  }

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer)
    setShowModal(true)
  }

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowDetailPanel(true)
  }

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm("Are you sure you want to delete this customer?")) return

    try {
      const response = await fetch(`/api/crm/customers/${customerId}`, {
        method: "DELETE"
      })
      if (response.ok) {
        fetchCustomers()
      }
    } catch (error) {
      console.error("Failed to delete customer:", error)
    }
  }

  const handleSaveCustomer = async (customerData: Partial<Customer>) => {
    try {
      const url = editingCustomer
        ? `/api/crm/customers/${editingCustomer.id}`
        : "/api/crm/customers"

      const response = await fetch(url, {
        method: editingCustomer ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...customerData, workspaceId })
      })

      if (response.ok) {
        setShowModal(false)
        fetchCustomers()
        router.replace(`/${workspaceId}/crm/customers`)
      }
    } catch (error) {
      console.error("Failed to save customer:", error)
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingCustomer(null)
    router.replace(`/${workspaceId}/crm/customers`)
  }

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className={cn("flex-1 p-6", showDetailPanel && "pr-0")}>
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Customers</h2>
            <p className="text-sm text-gray-500">{total} total customers</p>
          </div>
          <button
            onClick={handleCreateCustomer}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
          >
            <IconPlus size={18} />
            Add Customer
          </button>
        </div>

        {/* Search and Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <IconSearch
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value as CustomerStatus | "all")
              setPage(1)
            }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="all">All Statuses</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Customer Table */}
        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Source
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Location
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <IconLoader2
                      size={24}
                      className="mx-auto animate-spin text-purple-600"
                    />
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No customers found
                  </td>
                </tr>
              ) : (
                customers.map(customer => (
                  <tr
                    key={customer.id}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                    onClick={() => handleViewCustomer(customer)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {customer.name}
                      </div>
                      {customer.tags && customer.tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {customer.tags.slice(0, 2).map(tag => (
                            <span
                              key={tag}
                              className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                            >
                              {tag}
                            </span>
                          ))}
                          {customer.tags.length > 2 && (
                            <span className="text-xs text-gray-400">
                              +{customer.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {customer.phone && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <IconPhone size={14} />
                            {customer.phone}
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <IconMail size={14} />
                            {customer.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                          statusColors[customer.status]
                        )}
                      >
                        {statusLabels[customer.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {customer.source
                        ? sourceLabels[customer.source as CustomerSource]
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {customer.city || customer.state ? (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <IconMapPin size={14} />
                          {[customer.city, customer.state]
                            .filter(Boolean)
                            .join(", ")}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="flex justify-end gap-1"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleViewCustomer(customer)}
                          className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                          title="View"
                        >
                          <IconEye size={16} />
                        </button>
                        <button
                          onClick={() => handleEditCustomer(customer)}
                          className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                          title="Edit"
                        >
                          <IconEdit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(customer.id)}
                          className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600"
                          title="Delete"
                        >
                          <IconTrash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t bg-gray-50 px-4 py-3">
              <div className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded border bg-white px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <IconChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded border bg-white px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <IconChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {showDetailPanel && selectedCustomer && (
        <CustomerDetailPanel
          customer={selectedCustomer}
          onClose={() => {
            setShowDetailPanel(false)
            setSelectedCustomer(null)
          }}
          onEdit={() => handleEditCustomer(selectedCustomer)}
          workspaceId={workspaceId}
        />
      )}

      {/* Customer Modal */}
      {showModal && (
        <CustomerModal
          customer={editingCustomer}
          onSave={handleSaveCustomer}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
