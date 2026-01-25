// lib/crm/jobs.ts
// Job/Project management functions

import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { scheduleStatusUpdate, enrollInSequence } from "@/lib/jobs/scheduler"

// Job types
export interface Job {
  id: string
  workspaceId: string
  customerId?: string
  title: string
  jobNumber?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  latitude?: number
  longitude?: number
  status: JobStatus
  jobType?: JobType
  roofAreaSqft?: number
  roofPitch?: string
  roofLayers?: number
  currentMaterial?: string
  newMaterial?: string
  estimatedCost?: number
  actualCost?: number
  materialCost?: number
  laborCost?: number
  profitMargin?: number
  estimateDate?: Date
  scheduledDate?: Date
  scheduledTime?: string
  estimatedDurationDays?: number
  startedAt?: Date
  completedAt?: Date
  crewId?: string
  salespersonId?: string
  isInsuranceClaim?: boolean
  insuranceCompany?: string
  claimNumber?: string
  adjusterName?: string
  adjusterPhone?: string
  notes?: string
  internalNotes?: string
  tags?: string[]
  propertyReportId?: string
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
  // Joined data
  customer?: any
  crew?: any
}

export type JobStatus =
  | "lead"
  | "estimate_scheduled"
  | "estimate_sent"
  | "negotiating"
  | "sold"
  | "materials_ordered"
  | "scheduled"
  | "in_progress"
  | "complete"
  | "invoiced"
  | "paid"
  | "cancelled"
  | "on_hold"

export type JobType =
  | "roof_replacement"
  | "roof_repair"
  | "inspection"
  | "maintenance"
  | "gutters"
  | "siding"
  | "windows"
  | "solar"
  | "insurance_claim"
  | "other"

export interface CreateJobInput {
  workspaceId: string
  customerId?: string
  title: string
  jobNumber?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  status?: JobStatus
  jobType?: JobType
  roofAreaSqft?: number
  roofPitch?: string
  currentMaterial?: string
  newMaterial?: string
  estimatedCost?: number
  estimateDate?: Date
  scheduledDate?: Date
  scheduledTime?: string
  estimatedDurationDays?: number
  crewId?: string
  salespersonId?: string
  isInsuranceClaim?: boolean
  insuranceCompany?: string
  claimNumber?: string
  notes?: string
  internalNotes?: string
  tags?: string[]
  propertyReportId?: string
  metadata?: Record<string, unknown>
}

export interface UpdateJobInput {
  title?: string
  jobNumber?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  status?: JobStatus
  jobType?: JobType
  roofAreaSqft?: number
  roofPitch?: string
  roofLayers?: number
  currentMaterial?: string
  newMaterial?: string
  estimatedCost?: number
  actualCost?: number
  materialCost?: number
  laborCost?: number
  profitMargin?: number
  estimateDate?: Date
  scheduledDate?: Date
  scheduledTime?: string
  estimatedDurationDays?: number
  crewId?: string
  salespersonId?: string
  isInsuranceClaim?: boolean
  insuranceCompany?: string
  claimNumber?: string
  adjusterName?: string
  adjusterPhone?: string
  notes?: string
  internalNotes?: string
  tags?: string[]
  metadata?: Record<string, unknown>
}

export interface JobFilters {
  status?: JobStatus | JobStatus[]
  jobType?: JobType | JobType[]
  customerId?: string
  crewId?: string
  salespersonId?: string
  isInsuranceClaim?: boolean
  scheduledDateRange?: { start: Date; end: Date }
  search?: string
}

// Get Supabase client
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseServiceKey)
}

// Map database row to Job type
function mapDbToJob(row: any): Job {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    customerId: row.customer_id,
    title: row.title,
    jobNumber: row.job_number,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    latitude: row.latitude,
    longitude: row.longitude,
    status: row.status,
    jobType: row.job_type,
    roofAreaSqft: row.roof_area_sqft,
    roofPitch: row.roof_pitch,
    roofLayers: row.roof_layers,
    currentMaterial: row.current_material,
    newMaterial: row.new_material,
    estimatedCost: row.estimated_cost ? parseFloat(row.estimated_cost) : undefined,
    actualCost: row.actual_cost ? parseFloat(row.actual_cost) : undefined,
    materialCost: row.material_cost ? parseFloat(row.material_cost) : undefined,
    laborCost: row.labor_cost ? parseFloat(row.labor_cost) : undefined,
    profitMargin: row.profit_margin ? parseFloat(row.profit_margin) : undefined,
    estimateDate: row.estimate_date ? new Date(row.estimate_date) : undefined,
    scheduledDate: row.scheduled_date ? new Date(row.scheduled_date) : undefined,
    scheduledTime: row.scheduled_time,
    estimatedDurationDays: row.estimated_duration_days,
    startedAt: row.started_at ? new Date(row.started_at) : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    crewId: row.crew_id,
    salespersonId: row.salesperson_id,
    isInsuranceClaim: row.is_insurance_claim,
    insuranceCompany: row.insurance_company,
    claimNumber: row.claim_number,
    adjusterName: row.adjuster_name,
    adjusterPhone: row.adjuster_phone,
    notes: row.notes,
    internalNotes: row.internal_notes,
    tags: row.tags,
    propertyReportId: row.property_report_id,
    metadata: row.metadata,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    customer: row.customer,
    crew: row.crew
  }
}

// Create a new job
export async function createJob(
  input: CreateJobInput,
  supabase?: SupabaseClient
): Promise<Job | null> {
  const client = supabase || getServiceClient()

  const { data, error } = await client
    .from("jobs")
    .insert({
      workspace_id: input.workspaceId,
      customer_id: input.customerId,
      title: input.title,
      job_number: input.jobNumber,
      address: input.address,
      city: input.city,
      state: input.state,
      zip: input.zip,
      status: input.status || "lead",
      job_type: input.jobType,
      roof_area_sqft: input.roofAreaSqft,
      roof_pitch: input.roofPitch,
      current_material: input.currentMaterial,
      new_material: input.newMaterial,
      estimated_cost: input.estimatedCost,
      estimate_date: input.estimateDate?.toISOString(),
      scheduled_date: input.scheduledDate?.toISOString().split("T")[0],
      scheduled_time: input.scheduledTime,
      estimated_duration_days: input.estimatedDurationDays || 1,
      crew_id: input.crewId,
      salesperson_id: input.salespersonId,
      is_insurance_claim: input.isInsuranceClaim,
      insurance_company: input.insuranceCompany,
      claim_number: input.claimNumber,
      notes: input.notes,
      internal_notes: input.internalNotes,
      tags: input.tags,
      property_report_id: input.propertyReportId,
      metadata: input.metadata
    })
    .select()
    .single()

  if (error) {
    console.error("Failed to create job:", error)
    return null
  }

  return mapDbToJob(data)
}

// Get job by ID
export async function getJob(
  jobId: string,
  includeRelations: boolean = true,
  supabase?: SupabaseClient
): Promise<Job | null> {
  const client = supabase || getServiceClient()

  const query = includeRelations
    ? client.from("jobs").select(`
        *,
        customer:customers(*),
        crew:crews(*)
      `)
    : client.from("jobs").select("*")

  const { data, error } = await query.eq("id", jobId).single()

  if (error) {
    console.error("Failed to get job:", error)
    return null
  }

  return mapDbToJob(data)
}

// Update job
export async function updateJob(
  jobId: string,
  input: UpdateJobInput,
  supabase?: SupabaseClient
): Promise<Job | null> {
  const client = supabase || getServiceClient()

  // Get current job to check for status change
  const { data: currentJob } = await client
    .from("jobs")
    .select("status, customer_id, workspace_id")
    .eq("id", jobId)
    .single()

  const updateData: Record<string, any> = {}

  if (input.title !== undefined) updateData.title = input.title
  if (input.jobNumber !== undefined) updateData.job_number = input.jobNumber
  if (input.address !== undefined) updateData.address = input.address
  if (input.city !== undefined) updateData.city = input.city
  if (input.state !== undefined) updateData.state = input.state
  if (input.zip !== undefined) updateData.zip = input.zip
  if (input.status !== undefined) updateData.status = input.status
  if (input.jobType !== undefined) updateData.job_type = input.jobType
  if (input.roofAreaSqft !== undefined) updateData.roof_area_sqft = input.roofAreaSqft
  if (input.roofPitch !== undefined) updateData.roof_pitch = input.roofPitch
  if (input.roofLayers !== undefined) updateData.roof_layers = input.roofLayers
  if (input.currentMaterial !== undefined) updateData.current_material = input.currentMaterial
  if (input.newMaterial !== undefined) updateData.new_material = input.newMaterial
  if (input.estimatedCost !== undefined) updateData.estimated_cost = input.estimatedCost
  if (input.actualCost !== undefined) updateData.actual_cost = input.actualCost
  if (input.materialCost !== undefined) updateData.material_cost = input.materialCost
  if (input.laborCost !== undefined) updateData.labor_cost = input.laborCost
  if (input.profitMargin !== undefined) updateData.profit_margin = input.profitMargin
  if (input.estimateDate !== undefined) updateData.estimate_date = input.estimateDate?.toISOString()
  if (input.scheduledDate !== undefined) updateData.scheduled_date = input.scheduledDate?.toISOString().split("T")[0]
  if (input.scheduledTime !== undefined) updateData.scheduled_time = input.scheduledTime
  if (input.estimatedDurationDays !== undefined) updateData.estimated_duration_days = input.estimatedDurationDays
  if (input.crewId !== undefined) updateData.crew_id = input.crewId
  if (input.salespersonId !== undefined) updateData.salesperson_id = input.salespersonId
  if (input.isInsuranceClaim !== undefined) updateData.is_insurance_claim = input.isInsuranceClaim
  if (input.insuranceCompany !== undefined) updateData.insurance_company = input.insuranceCompany
  if (input.claimNumber !== undefined) updateData.claim_number = input.claimNumber
  if (input.adjusterName !== undefined) updateData.adjuster_name = input.adjusterName
  if (input.adjusterPhone !== undefined) updateData.adjuster_phone = input.adjusterPhone
  if (input.notes !== undefined) updateData.notes = input.notes
  if (input.internalNotes !== undefined) updateData.internal_notes = input.internalNotes
  if (input.tags !== undefined) updateData.tags = input.tags
  if (input.metadata !== undefined) updateData.metadata = input.metadata

  // Handle special status transitions
  if (input.status === "in_progress" && currentJob?.status !== "in_progress") {
    updateData.started_at = new Date().toISOString()
  }
  if (input.status === "complete" && currentJob?.status !== "complete") {
    updateData.completed_at = new Date().toISOString()
  }

  const { data, error } = await client
    .from("jobs")
    .update(updateData)
    .eq("id", jobId)
    .select()
    .single()

  if (error) {
    console.error("Failed to update job:", error)
    return null
  }

  // If status changed, notify customer
  if (input.status && currentJob && input.status !== currentJob.status && currentJob.customer_id) {
    await scheduleStatusUpdate({
      workspaceId: currentJob.workspace_id,
      customerId: currentJob.customer_id,
      jobId,
      oldStatus: currentJob.status,
      newStatus: input.status,
      channel: "sms"
    })
  }

  return mapDbToJob(data)
}

// Delete job
export async function deleteJob(
  jobId: string,
  supabase?: SupabaseClient
): Promise<boolean> {
  const client = supabase || getServiceClient()

  const { error } = await client.from("jobs").delete().eq("id", jobId)

  if (error) {
    console.error("Failed to delete job:", error)
    return false
  }

  return true
}

// List jobs with filters
export async function listJobs(
  workspaceId: string,
  filters?: JobFilters,
  pagination?: { page: number; pageSize: number },
  supabase?: SupabaseClient
): Promise<{ jobs: Job[]; total: number }> {
  const client = supabase || getServiceClient()
  const page = pagination?.page || 1
  const pageSize = pagination?.pageSize || 20
  const offset = (page - 1) * pageSize

  let query = client
    .from("jobs")
    .select(
      `
      *,
      customer:customers(id, name, phone, email),
      crew:crews(id, name, leader_name, phone)
    `,
      { count: "exact" }
    )
    .eq("workspace_id", workspaceId)

  // Apply filters
  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in("status", filters.status)
    } else {
      query = query.eq("status", filters.status)
    }
  }

  if (filters?.jobType) {
    if (Array.isArray(filters.jobType)) {
      query = query.in("job_type", filters.jobType)
    } else {
      query = query.eq("job_type", filters.jobType)
    }
  }

  if (filters?.customerId) {
    query = query.eq("customer_id", filters.customerId)
  }

  if (filters?.crewId) {
    query = query.eq("crew_id", filters.crewId)
  }

  if (filters?.salespersonId) {
    query = query.eq("salesperson_id", filters.salespersonId)
  }

  if (filters?.isInsuranceClaim !== undefined) {
    query = query.eq("is_insurance_claim", filters.isInsuranceClaim)
  }

  if (filters?.scheduledDateRange) {
    query = query
      .gte("scheduled_date", filters.scheduledDateRange.start.toISOString().split("T")[0])
      .lte("scheduled_date", filters.scheduledDateRange.end.toISOString().split("T")[0])
  }

  if (filters?.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,address.ilike.%${filters.search}%,job_number.ilike.%${filters.search}%`
    )
  }

  // Apply pagination and ordering
  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1)

  const { data, error, count } = await query

  if (error) {
    console.error("Failed to list jobs:", error)
    return { jobs: [], total: 0 }
  }

  return {
    jobs: data.map(mapDbToJob),
    total: count || 0
  }
}

// Get jobs for a customer
export async function getJobsForCustomer(
  customerId: string,
  supabase?: SupabaseClient
): Promise<Job[]> {
  const client = supabase || getServiceClient()

  const { data, error } = await client
    .from("jobs")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Failed to get jobs for customer:", error)
    return []
  }

  return data.map(mapDbToJob)
}

// Get jobs scheduled for a date
export async function getJobsForDate(
  workspaceId: string,
  date: Date,
  supabase?: SupabaseClient
): Promise<Job[]> {
  const client = supabase || getServiceClient()
  const dateStr = date.toISOString().split("T")[0]

  const { data, error } = await client
    .from("jobs")
    .select(
      `
      *,
      customer:customers(id, name, phone),
      crew:crews(id, name, phone)
    `
    )
    .eq("workspace_id", workspaceId)
    .eq("scheduled_date", dateStr)
    .in("status", ["scheduled", "in_progress"])
    .order("scheduled_time", { ascending: true })

  if (error) {
    console.error("Failed to get jobs for date:", error)
    return []
  }

  return data.map(mapDbToJob)
}

// Update job status
export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  supabase?: SupabaseClient
): Promise<boolean> {
  const client = supabase || getServiceClient()

  // Get current job info
  const { data: currentJob } = await client
    .from("jobs")
    .select("status, customer_id, workspace_id")
    .eq("id", jobId)
    .single()

  if (!currentJob) return false

  const updateData: Record<string, any> = { status }

  // Handle timestamps
  if (status === "in_progress" && currentJob.status !== "in_progress") {
    updateData.started_at = new Date().toISOString()
  }
  if (status === "complete" && currentJob.status !== "complete") {
    updateData.completed_at = new Date().toISOString()
  }

  const { error } = await client.from("jobs").update(updateData).eq("id", jobId)

  if (error) {
    console.error("Failed to update job status:", error)
    return false
  }

  // Notify customer of status change
  if (currentJob.customer_id && status !== currentJob.status) {
    await scheduleStatusUpdate({
      workspaceId: currentJob.workspace_id,
      customerId: currentJob.customer_id,
      jobId,
      oldStatus: currentJob.status,
      newStatus: status,
      channel: "sms"
    })
  }

  return true
}

// Assign crew to job
export async function assignCrewToJob(
  jobId: string,
  crewId: string,
  supabase?: SupabaseClient
): Promise<boolean> {
  const client = supabase || getServiceClient()

  const { error } = await client
    .from("jobs")
    .update({ crew_id: crewId })
    .eq("id", jobId)

  return !error
}
