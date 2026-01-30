"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import {
  IconPlus,
  IconPhone,
  IconMapPin,
  IconEdit,
  IconTrash,
  IconLoader2,
  IconUsers,
  IconCalendar,
  IconTool,
  IconX,
  IconCheck
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface Crew {
  id: string
  workspaceId: string
  name: string
  leaderName?: string
  phone?: string
  email?: string
  skills?: string[]
  maxJobsPerDay: number
  typicalCrewSize: number
  serviceRadiusMiles?: number
  homeAddress?: string
  isActive: boolean
  currentJobId?: string
  createdAt: string
}

const skillOptions = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "asphalt_shingle", label: "Asphalt Shingle" },
  { value: "metal", label: "Metal Roofing" },
  { value: "tile", label: "Tile Roofing" },
  { value: "flat", label: "Flat/Membrane" },
  { value: "steep_slope", label: "Steep Slope" },
  { value: "gutters", label: "Gutters" },
  { value: "siding", label: "Siding" },
  { value: "repairs", label: "Repairs" }
]

export default function CrewsPage() {
  const params = useParams()
  const workspaceId = params.workspaceid as string

  const [crews, setCrews] = useState<Crew[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCrew, setEditingCrew] = useState<Crew | null>(null)

  const fetchCrews = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/crm/crews?workspaceId=${workspaceId}`)
      if (response.ok) {
        const data = await response.json()
        setCrews(data.crews || [])
      }
    } catch (error) {
      console.error("Failed to fetch crews:", error)
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    fetchCrews()
  }, [fetchCrews])

  const handleCreateCrew = () => {
    setEditingCrew(null)
    setShowModal(true)
  }

  const handleEditCrew = (crew: Crew) => {
    setEditingCrew(crew)
    setShowModal(true)
  }

  const handleDeleteCrew = async (crewId: string) => {
    if (!confirm("Are you sure you want to delete this crew?")) return

    try {
      const response = await fetch(`/api/crm/crews/${crewId}`, {
        method: "DELETE"
      })
      if (response.ok) {
        fetchCrews()
      }
    } catch (error) {
      console.error("Failed to delete crew:", error)
    }
  }

  const handleSaveCrew = async (crewData: Partial<Crew>) => {
    try {
      const url = editingCrew
        ? `/api/crm/crews/${editingCrew.id}`
        : "/api/crm/crews"

      const response = await fetch(url, {
        method: editingCrew ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...crewData, workspaceId })
      })

      if (response.ok) {
        setShowModal(false)
        fetchCrews()
      }
    } catch (error) {
      console.error("Failed to save crew:", error)
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Crews</h2>
          <p className="text-sm text-gray-500">
            Manage your roofing crews and their assignments
          </p>
        </div>
        <button
          onClick={handleCreateCrew}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
        >
          <IconPlus size={18} />
          Add Crew
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <IconLoader2 size={32} className="animate-spin text-purple-600" />
        </div>
      ) : crews.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
          <IconUsers size={48} className="mb-4 text-gray-300" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            No crews yet
          </h3>
          <p className="mb-4 text-sm text-gray-500">
            Add your first crew to start scheduling jobs
          </p>
          <button
            onClick={handleCreateCrew}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
          >
            <IconPlus size={18} />
            Add Your First Crew
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {crews.map(crew => (
            <div
              key={crew.id}
              className="rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{crew.name}</h3>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        crew.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      )}
                    >
                      {crew.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {crew.leaderName && (
                    <p className="mt-1 text-sm text-gray-500">
                      Lead: {crew.leaderName}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEditCrew(crew)}
                    className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title="Edit"
                  >
                    <IconEdit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteCrew(crew.id)}
                    className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-100 hover:text-red-600"
                    title="Delete"
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {crew.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <IconPhone size={14} />
                    {crew.phone}
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-600">
                  <IconUsers size={14} />
                  {crew.typicalCrewSize} members
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <IconCalendar size={14} />
                  Up to {crew.maxJobsPerDay} jobs/day
                </div>
                {crew.serviceRadiusMiles && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <IconMapPin size={14} />
                    {crew.serviceRadiusMiles} mile radius
                  </div>
                )}
              </div>

              {crew.skills && crew.skills.length > 0 && (
                <div className="mt-4">
                  <div className="flex flex-wrap gap-1">
                    {crew.skills.slice(0, 4).map(skill => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700"
                      >
                        <IconTool size={10} />
                        {skillOptions.find(s => s.value === skill)?.label ||
                          skill}
                      </span>
                    ))}
                    {crew.skills.length > 4 && (
                      <span className="text-xs text-gray-400">
                        +{crew.skills.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Crew Modal */}
      {showModal && (
        <CrewModal
          crew={editingCrew}
          onSave={handleSaveCrew}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

// Crew Modal Component
function CrewModal({
  crew,
  onSave,
  onClose
}: {
  crew: Crew | null
  onSave: (data: Partial<Crew>) => Promise<void>
  onClose: () => void
}) {
  const [formData, setFormData] = useState<Partial<Crew>>({
    name: "",
    leaderName: "",
    phone: "",
    email: "",
    skills: [],
    maxJobsPerDay: 2,
    typicalCrewSize: 4,
    serviceRadiusMiles: 30,
    homeAddress: "",
    isActive: true
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (crew) {
      setFormData({
        name: crew.name || "",
        leaderName: crew.leaderName || "",
        phone: crew.phone || "",
        email: crew.email || "",
        skills: crew.skills || [],
        maxJobsPerDay: crew.maxJobsPerDay || 2,
        typicalCrewSize: crew.typicalCrewSize || 4,
        serviceRadiusMiles: crew.serviceRadiusMiles || 30,
        homeAddress: crew.homeAddress || "",
        isActive: crew.isActive ?? true
      })
    }
  }, [crew])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked

    setFormData(prev => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : type === "number"
            ? parseInt(value) || 0
            : value
    }))
  }

  const toggleSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills?.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...(prev.skills || []), skill]
    }))
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
      <div className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {crew ? "Edit Crew" : "Add Crew"}
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
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-gray-600">
                Crew Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="Alpha Crew"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-600">
                Crew Leader
              </label>
              <input
                type="text"
                name="leaderName"
                value={formData.leaderName}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="Mike Johnson"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm text-gray-600">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="crew@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-sm text-gray-600">
                  Crew Size
                </label>
                <input
                  type="number"
                  name="typicalCrewSize"
                  value={formData.typicalCrewSize}
                  onChange={handleChange}
                  min="1"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">
                  Jobs/Day
                </label>
                <input
                  type="number"
                  name="maxJobsPerDay"
                  value={formData.maxJobsPerDay}
                  onChange={handleChange}
                  min="1"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">
                  Radius (mi)
                </label>
                <input
                  type="number"
                  name="serviceRadiusMiles"
                  value={formData.serviceRadiusMiles}
                  onChange={handleChange}
                  min="1"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-600">
                Home Base Address
              </label>
              <input
                type="text"
                name="homeAddress"
                value={formData.homeAddress}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="123 Warehouse Rd, Denver, CO"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-600">Skills</label>
              <div className="flex flex-wrap gap-2">
                {skillOptions.map(skill => (
                  <button
                    key={skill.value}
                    type="button"
                    onClick={() => toggleSkill(skill.value)}
                    className={cn(
                      "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      formData.skills?.includes(skill.value)
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                  >
                    {formData.skills?.includes(skill.value) && (
                      <IconCheck size={12} />
                    )}
                    {skill.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700">Crew is active</span>
            </label>
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
              disabled={saving || !formData.name}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <IconLoader2 size={16} className="animate-spin" />}
              {crew ? "Save Changes" : "Add Crew"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
