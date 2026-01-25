// lib/crm/crews.ts
// Crew management functions

import { createClient, SupabaseClient } from "@supabase/supabase-js"

// Crew types
export interface Crew {
  id: string
  workspaceId: string
  name: string
  leaderName?: string
  phone?: string
  email?: string
  skills: string[]
  maxJobsPerDay: number
  typicalCrewSize: number
  serviceRadiusMiles: number
  homeLocationLat?: number
  homeLocationLng?: number
  homeAddress?: string
  active: boolean
  notes?: string
  hourlyRate?: number
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface CrewAvailability {
  id: string
  crewId: string
  date: Date
  available: boolean
  startTime?: string
  endTime?: string
  notes?: string
}

export interface CreateCrewInput {
  workspaceId: string
  name: string
  leaderName?: string
  phone?: string
  email?: string
  skills?: string[]
  maxJobsPerDay?: number
  typicalCrewSize?: number
  serviceRadiusMiles?: number
  homeLocationLat?: number
  homeLocationLng?: number
  homeAddress?: string
  hourlyRate?: number
  notes?: string
  metadata?: Record<string, unknown>
}

export interface UpdateCrewInput {
  name?: string
  leaderName?: string
  phone?: string
  email?: string
  skills?: string[]
  maxJobsPerDay?: number
  typicalCrewSize?: number
  serviceRadiusMiles?: number
  homeLocationLat?: number
  homeLocationLng?: number
  homeAddress?: string
  active?: boolean
  hourlyRate?: number
  notes?: string
  metadata?: Record<string, unknown>
}

// Common roofing skills
export const ROOFING_SKILLS = [
  "residential",
  "commercial",
  "steep_slope",
  "flat",
  "metal",
  "tile",
  "slate",
  "cedar",
  "asphalt_shingle",
  "tpo",
  "epdm",
  "gutters",
  "skylights",
  "repairs"
]

// Get Supabase client
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseServiceKey)
}

// Map database row to Crew type
function mapDbToCrew(row: any): Crew {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    leaderName: row.leader_name,
    phone: row.phone,
    email: row.email,
    skills: row.skills || [],
    maxJobsPerDay: row.max_jobs_per_day || 1,
    typicalCrewSize: row.typical_crew_size || 3,
    serviceRadiusMiles: row.service_radius_miles || 50,
    homeLocationLat: row.home_location_lat,
    homeLocationLng: row.home_location_lng,
    homeAddress: row.home_address,
    active: row.active,
    notes: row.notes,
    hourlyRate: row.hourly_rate ? parseFloat(row.hourly_rate) : undefined,
    metadata: row.metadata,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}

// Create a new crew
export async function createCrew(
  input: CreateCrewInput,
  supabase?: SupabaseClient
): Promise<Crew | null> {
  const client = supabase || getServiceClient()

  const { data, error } = await client
    .from("crews")
    .insert({
      workspace_id: input.workspaceId,
      name: input.name,
      leader_name: input.leaderName,
      phone: input.phone,
      email: input.email,
      skills: input.skills || [],
      max_jobs_per_day: input.maxJobsPerDay || 1,
      typical_crew_size: input.typicalCrewSize || 3,
      service_radius_miles: input.serviceRadiusMiles || 50,
      home_location_lat: input.homeLocationLat,
      home_location_lng: input.homeLocationLng,
      home_address: input.homeAddress,
      hourly_rate: input.hourlyRate,
      notes: input.notes,
      metadata: input.metadata
    })
    .select()
    .single()

  if (error) {
    console.error("Failed to create crew:", error)
    return null
  }

  return mapDbToCrew(data)
}

// Get crew by ID
export async function getCrew(
  crewId: string,
  supabase?: SupabaseClient
): Promise<Crew | null> {
  const client = supabase || getServiceClient()

  const { data, error } = await client
    .from("crews")
    .select()
    .eq("id", crewId)
    .single()

  if (error) {
    console.error("Failed to get crew:", error)
    return null
  }

  return mapDbToCrew(data)
}

// Update crew
export async function updateCrew(
  crewId: string,
  input: UpdateCrewInput,
  supabase?: SupabaseClient
): Promise<Crew | null> {
  const client = supabase || getServiceClient()

  const updateData: Record<string, any> = {}

  if (input.name !== undefined) updateData.name = input.name
  if (input.leaderName !== undefined) updateData.leader_name = input.leaderName
  if (input.phone !== undefined) updateData.phone = input.phone
  if (input.email !== undefined) updateData.email = input.email
  if (input.skills !== undefined) updateData.skills = input.skills
  if (input.maxJobsPerDay !== undefined)
    updateData.max_jobs_per_day = input.maxJobsPerDay
  if (input.typicalCrewSize !== undefined)
    updateData.typical_crew_size = input.typicalCrewSize
  if (input.serviceRadiusMiles !== undefined)
    updateData.service_radius_miles = input.serviceRadiusMiles
  if (input.homeLocationLat !== undefined)
    updateData.home_location_lat = input.homeLocationLat
  if (input.homeLocationLng !== undefined)
    updateData.home_location_lng = input.homeLocationLng
  if (input.homeAddress !== undefined)
    updateData.home_address = input.homeAddress
  if (input.active !== undefined) updateData.active = input.active
  if (input.hourlyRate !== undefined) updateData.hourly_rate = input.hourlyRate
  if (input.notes !== undefined) updateData.notes = input.notes
  if (input.metadata !== undefined) updateData.metadata = input.metadata

  const { data, error } = await client
    .from("crews")
    .update(updateData)
    .eq("id", crewId)
    .select()
    .single()

  if (error) {
    console.error("Failed to update crew:", error)
    return null
  }

  return mapDbToCrew(data)
}

// Delete crew
export async function deleteCrew(
  crewId: string,
  supabase?: SupabaseClient
): Promise<boolean> {
  const client = supabase || getServiceClient()

  const { error } = await client.from("crews").delete().eq("id", crewId)

  if (error) {
    console.error("Failed to delete crew:", error)
    return false
  }

  return true
}

// List crews for workspace
export async function listCrews(
  workspaceId: string,
  activeOnly: boolean = true,
  supabase?: SupabaseClient
): Promise<Crew[]> {
  const client = supabase || getServiceClient()

  let query = client.from("crews").select().eq("workspace_id", workspaceId)

  if (activeOnly) {
    query = query.eq("active", true)
  }

  const { data, error } = await query.order("name", { ascending: true })

  if (error) {
    console.error("Failed to list crews:", error)
    return []
  }

  return data.map(mapDbToCrew)
}

// Get available crews for a date
export async function getAvailableCrews(
  workspaceId: string,
  date: Date,
  requiredSkills?: string[],
  jobLocation?: { lat: number; lng: number },
  supabase?: SupabaseClient
): Promise<(Crew & { distance?: number })[]> {
  const client = supabase || getServiceClient()
  const dateStr = date.toISOString().split("T")[0]

  // Get all active crews
  const { data: crews, error: crewError } = await client
    .from("crews")
    .select()
    .eq("workspace_id", workspaceId)
    .eq("active", true)

  if (crewError || !crews) {
    console.error("Failed to get crews:", crewError)
    return []
  }

  // Get availability records for this date
  const { data: availability } = await client
    .from("crew_availability")
    .select()
    .in(
      "crew_id",
      crews.map(c => c.id)
    )
    .eq("date", dateStr)

  // Get job counts for this date
  const { data: jobCounts } = await client
    .from("jobs")
    .select("crew_id")
    .eq("scheduled_date", dateStr)
    .in("status", ["scheduled", "in_progress"])

  const crewJobCounts = new Map<string, number>()
  jobCounts?.forEach(j => {
    const count = crewJobCounts.get(j.crew_id) || 0
    crewJobCounts.set(j.crew_id, count + 1)
  })

  const availabilityMap = new Map(availability?.map(a => [a.crew_id, a]))

  // Filter and process crews
  const availableCrews = crews
    .map(mapDbToCrew)
    .filter(crew => {
      // Check availability record
      const avail = availabilityMap.get(crew.id)
      if (avail && !avail.available) {
        return false
      }

      // Check if at capacity
      const currentJobs = crewJobCounts.get(crew.id) || 0
      if (currentJobs >= crew.maxJobsPerDay) {
        return false
      }

      // Check skills
      if (requiredSkills && requiredSkills.length > 0) {
        const hasAllSkills = requiredSkills.every(skill =>
          crew.skills.includes(skill)
        )
        if (!hasAllSkills) {
          return false
        }
      }

      return true
    })
    .map(crew => {
      // Calculate distance if job location provided
      let distance: number | undefined
      if (jobLocation && crew.homeLocationLat && crew.homeLocationLng) {
        distance = calculateDistance(
          crew.homeLocationLat,
          crew.homeLocationLng,
          jobLocation.lat,
          jobLocation.lng
        )

        // Filter by service radius
        if (distance > crew.serviceRadiusMiles) {
          return null
        }
      }

      return { ...crew, distance }
    })
    .filter((c): c is Crew & { distance?: number } => c !== null)
    .sort((a, b) => {
      // Sort by distance if available, otherwise by name
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance
      }
      return a.name.localeCompare(b.name)
    })

  return availableCrews
}

// Set crew availability for a date
export async function setCrewAvailability(
  crewId: string,
  date: Date,
  available: boolean,
  startTime?: string,
  endTime?: string,
  notes?: string,
  supabase?: SupabaseClient
): Promise<boolean> {
  const client = supabase || getServiceClient()
  const dateStr = date.toISOString().split("T")[0]

  // Upsert availability record
  const { error } = await client.from("crew_availability").upsert(
    {
      crew_id: crewId,
      date: dateStr,
      available,
      start_time: startTime,
      end_time: endTime,
      notes
    },
    {
      onConflict: "crew_id,date"
    }
  )

  if (error) {
    console.error("Failed to set crew availability:", error)
    return false
  }

  return true
}

// Get crew availability for a date range
export async function getCrewAvailability(
  crewId: string,
  startDate: Date,
  endDate: Date,
  supabase?: SupabaseClient
): Promise<CrewAvailability[]> {
  const client = supabase || getServiceClient()

  const { data, error } = await client
    .from("crew_availability")
    .select()
    .eq("crew_id", crewId)
    .gte("date", startDate.toISOString().split("T")[0])
    .lte("date", endDate.toISOString().split("T")[0])
    .order("date", { ascending: true })

  if (error) {
    console.error("Failed to get crew availability:", error)
    return []
  }

  return data.map(row => ({
    id: row.id,
    crewId: row.crew_id,
    date: new Date(row.date),
    available: row.available,
    startTime: row.start_time,
    endTime: row.end_time,
    notes: row.notes
  }))
}

// Get crew schedule (jobs) for a date range
export async function getCrewSchedule(
  crewId: string,
  startDate: Date,
  endDate: Date,
  supabase?: SupabaseClient
): Promise<any[]> {
  const client = supabase || getServiceClient()

  const { data, error } = await client
    .from("jobs")
    .select(
      `
      id, title, address, scheduled_date, scheduled_time,
      estimated_duration_days, status,
      customer:customers(id, name, phone)
    `
    )
    .eq("crew_id", crewId)
    .gte("scheduled_date", startDate.toISOString().split("T")[0])
    .lte("scheduled_date", endDate.toISOString().split("T")[0])
    .in("status", ["scheduled", "in_progress"])
    .order("scheduled_date", { ascending: true })
    .order("scheduled_time", { ascending: true })

  if (error) {
    console.error("Failed to get crew schedule:", error)
    return []
  }

  return data
}

// Find best crew for a job
export async function findBestCrewForJob(
  workspaceId: string,
  date: Date,
  requiredSkills: string[],
  jobLocation?: { lat: number; lng: number },
  supabase?: SupabaseClient
): Promise<Crew | null> {
  const availableCrews = await getAvailableCrews(
    workspaceId,
    date,
    requiredSkills,
    jobLocation,
    supabase
  )

  if (availableCrews.length === 0) {
    return null
  }

  // Return the closest available crew
  return availableCrews[0]
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959 // Earth's radius in miles
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}
