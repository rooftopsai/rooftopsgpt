"use client"

import { useState, useEffect } from "react"
import { IconX, IconLoader2, IconSearch } from "@tabler/icons-react"

interface Job {
  id?: string
  title: string
  jobNumber?: string
  customerId?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  status: string
  jobType?: string
  roofAreaSqft?: number
  roofPitch?: string
  currentMaterial?: string
  newMaterial?: string
  estimatedCost?: number
  actualCost?: number
  scheduledDate?: string
  scheduledTime?: string
  estimatedDurationDays?: number
  crewId?: string
  isInsuranceClaim?: boolean
  insuranceCompany?: string
  claimNumber?: string
  notes?: string
  internalNotes?: string
}

interface Customer {
  id: string
  name: string
  phone?: string
  address?: string
  city?: string
  state?: string
}

interface Crew {
  id: string
  name: string
  leaderName?: string
}

interface JobModalProps {
  job: Job | null
  workspaceId: string
  onSave: (job: Partial<Job>) => Promise<void>
  onClose: () => void
}

const statusOptions = [
  { value: "lead", label: "Lead" },
  { value: "estimate_scheduled", label: "Estimate Scheduled" },
  { value: "estimate_sent", label: "Estimate Sent" },
  { value: "negotiating", label: "Negotiating" },
  { value: "sold", label: "Sold" },
  { value: "materials_ordered", label: "Materials Ordered" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "complete", label: "Complete" },
  { value: "invoiced", label: "Invoiced" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
  { value: "on_hold", label: "On Hold" }
]

const jobTypeOptions = [
  { value: "roof_replacement", label: "Roof Replacement" },
  { value: "roof_repair", label: "Roof Repair" },
  { value: "inspection", label: "Inspection" },
  { value: "maintenance", label: "Maintenance" },
  { value: "gutters", label: "Gutters" },
  { value: "siding", label: "Siding" },
  { value: "windows", label: "Windows" },
  { value: "solar", label: "Solar" },
  { value: "insurance_claim", label: "Insurance Claim" },
  { value: "other", label: "Other" }
]

const materialOptions = [
  { value: "asphalt_shingle", label: "Asphalt Shingle" },
  { value: "metal", label: "Metal" },
  { value: "tile", label: "Tile" },
  { value: "slate", label: "Slate" },
  { value: "wood_shake", label: "Wood Shake" },
  { value: "flat_membrane", label: "Flat/Membrane" },
  { value: "other", label: "Other" }
]

export function JobModal({ job, workspaceId, onSave, onClose }: JobModalProps) {
  const [formData, setFormData] = useState<Partial<Job>>({
    title: "",
    jobNumber: "",
    customerId: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    status: "lead",
    jobType: "",
    roofAreaSqft: undefined,
    roofPitch: "",
    currentMaterial: "",
    newMaterial: "",
    estimatedCost: undefined,
    actualCost: undefined,
    scheduledDate: "",
    scheduledTime: "",
    estimatedDurationDays: 1,
    crewId: "",
    isInsuranceClaim: false,
    insuranceCompany: "",
    claimNumber: "",
    notes: "",
    internalNotes: ""
  })

  const [customers, setCustomers] = useState<Customer[]>([])
  const [crews, setCrews] = useState<Crew[]>([])
  const [customerSearch, setCustomerSearch] = useState("")
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (job) {
      setFormData({
        title: job.title || "",
        jobNumber: job.jobNumber || "",
        customerId: job.customerId || "",
        address: job.address || "",
        city: job.city || "",
        state: job.state || "",
        zip: job.zip || "",
        status: job.status || "lead",
        jobType: job.jobType || "",
        roofAreaSqft: job.roofAreaSqft,
        roofPitch: job.roofPitch || "",
        currentMaterial: job.currentMaterial || "",
        newMaterial: job.newMaterial || "",
        estimatedCost: job.estimatedCost,
        actualCost: job.actualCost,
        scheduledDate: job.scheduledDate?.split("T")[0] || "",
        scheduledTime: job.scheduledTime || "",
        estimatedDurationDays: job.estimatedDurationDays || 1,
        crewId: job.crewId || "",
        isInsuranceClaim: job.isInsuranceClaim || false,
        insuranceCompany: job.insuranceCompany || "",
        claimNumber: job.claimNumber || "",
        notes: job.notes || "",
        internalNotes: job.internalNotes || ""
      })
    }
  }, [job])

  // Fetch customers for search
  useEffect(() => {
    const fetchCustomers = async () => {
      if (customerSearch.length < 2) {
        setCustomers([])
        return
      }

      try {
        const response = await fetch(
          `/api/crm/customers?workspaceId=${workspaceId}&search=${encodeURIComponent(customerSearch)}&pageSize=10`
        )
        if (response.ok) {
          const data = await response.json()
          setCustomers(data.customers || [])
        }
      } catch (error) {
        console.error("Failed to fetch customers:", error)
      }
    }

    const debounce = setTimeout(fetchCustomers, 300)
    return () => clearTimeout(debounce)
  }, [customerSearch, workspaceId])

  // Fetch crews
  useEffect(() => {
    const fetchCrews = async () => {
      try {
        const response = await fetch(
          `/api/crm/crews?workspaceId=${workspaceId}`
        )
        if (response.ok) {
          const data = await response.json()
          setCrews(data.crews || [])
        }
      } catch (error) {
        console.error("Failed to fetch crews:", error)
      }
    }

    fetchCrews()
  }, [workspaceId])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }))
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value ? parseFloat(value) : undefined
    }))
  }

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setFormData(prev => ({
      ...prev,
      customerId: customer.id,
      address: prev.address || customer.address || "",
      city: prev.city || customer.city || "",
      state: prev.state || customer.state || ""
    }))
    setCustomerSearch(customer.name)
    setShowCustomerDropdown(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave(formData)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {job ? "Edit Job" : "Create Job"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="max-h-[calc(90vh-130px)] overflow-y-auto p-6"
        >
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="mb-3 text-sm font-medium text-gray-700">
                Job Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="mb-1 block text-sm text-gray-600">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="Roof Replacement - 123 Main St"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    Job Number
                  </label>
                  <input
                    type="text"
                    name="jobNumber"
                    value={formData.jobNumber}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="2024-001"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    {statusOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Customer Selection */}
            <div>
              <h3 className="mb-3 text-sm font-medium text-gray-700">
                Customer
              </h3>
              <div className="relative">
                <IconSearch
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={e => {
                    setCustomerSearch(e.target.value)
                    setShowCustomerDropdown(true)
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="Search for customer..."
                />
                {showCustomerDropdown && customers.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border bg-white shadow-lg">
                    {customers.map(customer => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => handleSelectCustomer(customer)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        <span className="font-medium">{customer.name}</span>
                        {customer.city && (
                          <span className="text-gray-400">
                            {customer.city}, {customer.state}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Address */}
            <div>
              <h3 className="mb-3 text-sm font-medium text-gray-700">
                Job Location
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="mb-1 block text-sm text-gray-600">
                    Street Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="123 Main Street"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">
                      State
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">
                      ZIP
                    </label>
                    <input
                      type="text"
                      name="zip"
                      value={formData.zip}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Job Details */}
            <div>
              <h3 className="mb-3 text-sm font-medium text-gray-700">
                Job Details
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    Job Type
                  </label>
                  <select
                    name="jobType"
                    value={formData.jobType}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">Select type</option>
                    {jobTypeOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    Roof Area (sq ft)
                  </label>
                  <input
                    type="number"
                    name="roofAreaSqft"
                    value={formData.roofAreaSqft || ""}
                    onChange={handleNumberChange}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="2500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    Roof Pitch
                  </label>
                  <input
                    type="text"
                    name="roofPitch"
                    value={formData.roofPitch}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="6/12"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    Current Material
                  </label>
                  <select
                    name="currentMaterial"
                    value={formData.currentMaterial}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">Select material</option>
                    {materialOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    New Material
                  </label>
                  <select
                    name="newMaterial"
                    value={formData.newMaterial}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">Select material</option>
                    {materialOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Financials */}
            <div>
              <h3 className="mb-3 text-sm font-medium text-gray-700">
                Financials
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    Estimated Cost
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      $
                    </span>
                    <input
                      type="number"
                      name="estimatedCost"
                      value={formData.estimatedCost || ""}
                      onChange={handleNumberChange}
                      className="w-full rounded-lg border border-gray-200 py-2 pl-7 pr-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      placeholder="15000"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    Actual Cost
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      $
                    </span>
                    <input
                      type="number"
                      name="actualCost"
                      value={formData.actualCost || ""}
                      onChange={handleNumberChange}
                      className="w-full rounded-lg border border-gray-200 py-2 pl-7 pr-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      placeholder="14500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Scheduling */}
            <div>
              <h3 className="mb-3 text-sm font-medium text-gray-700">
                Scheduling
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    name="scheduledDate"
                    value={formData.scheduledDate}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    Time
                  </label>
                  <input
                    type="time"
                    name="scheduledTime"
                    value={formData.scheduledTime}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    Duration (days)
                  </label>
                  <input
                    type="number"
                    name="estimatedDurationDays"
                    value={formData.estimatedDurationDays || ""}
                    onChange={handleNumberChange}
                    min="1"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div className="col-span-3">
                  <label className="mb-1 block text-sm text-gray-600">
                    Assign Crew
                  </label>
                  <select
                    name="crewId"
                    value={formData.crewId}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">Select crew</option>
                    {crews.map(crew => (
                      <option key={crew.id} value={crew.id}>
                        {crew.name} {crew.leaderName && `(${crew.leaderName})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Insurance */}
            <div>
              <h3 className="mb-3 text-sm font-medium text-gray-700">
                Insurance
              </h3>
              <div className="space-y-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="isInsuranceClaim"
                    checked={formData.isInsuranceClaim}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">
                    This is an insurance claim
                  </span>
                </label>

                {formData.isInsuranceClaim && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm text-gray-600">
                        Insurance Company
                      </label>
                      <input
                        type="text"
                        name="insuranceCompany"
                        value={formData.insuranceCompany}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        placeholder="State Farm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-gray-600">
                        Claim Number
                      </label>
                      <input
                        type="text"
                        name="claimNumber"
                        value={formData.claimNumber}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        placeholder="CLM-123456"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <h3 className="mb-3 text-sm font-medium text-gray-700">Notes</h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    Customer Notes (visible to customer)
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={2}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    Internal Notes (team only)
                  </label>
                  <textarea
                    name="internalNotes"
                    value={formData.internalNotes}
                    onChange={handleChange}
                    rows={2}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.title}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <IconLoader2 size={16} className="animate-spin" />}
              {job ? "Save Changes" : "Create Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
