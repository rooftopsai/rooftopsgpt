// lib/crm/customers.ts
// Customer/Lead management functions

import { createClient, SupabaseClient } from "@supabase/supabase-js"

// Customer types
export interface Customer {
  id: string
  workspaceId: string
  name: string
  email?: string
  phone?: string
  secondaryPhone?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  latitude?: number
  longitude?: number
  status: CustomerStatus
  source?: CustomerSource
  sourceDetails?: string
  assignedTo?: string
  notes?: string
  tags?: string[]
  propertyType?: PropertyType
  preferredContactMethod?: ContactMethod
  doNotCall?: boolean
  doNotText?: boolean
  doNotEmail?: boolean
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
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

export type PropertyType =
  | "residential"
  | "commercial"
  | "multi_family"
  | "industrial"

export type ContactMethod = "phone" | "sms" | "email" | "any"

export interface CreateCustomerInput {
  workspaceId: string
  name: string
  email?: string
  phone?: string
  secondaryPhone?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  status?: CustomerStatus
  source?: CustomerSource
  sourceDetails?: string
  assignedTo?: string
  notes?: string
  tags?: string[]
  propertyType?: PropertyType
  preferredContactMethod?: ContactMethod
  metadata?: Record<string, unknown>
}

export interface UpdateCustomerInput {
  name?: string
  email?: string
  phone?: string
  secondaryPhone?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  status?: CustomerStatus
  source?: CustomerSource
  sourceDetails?: string
  assignedTo?: string
  notes?: string
  tags?: string[]
  propertyType?: PropertyType
  preferredContactMethod?: ContactMethod
  doNotCall?: boolean
  doNotText?: boolean
  doNotEmail?: boolean
  metadata?: Record<string, unknown>
}

export interface CustomerFilters {
  status?: CustomerStatus | CustomerStatus[]
  source?: CustomerSource | CustomerSource[]
  assignedTo?: string
  tags?: string[]
  search?: string
  propertyType?: PropertyType
  dateRange?: {
    start: Date
    end: Date
  }
}

// Get Supabase client
const getServiceClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseServiceKey)
}

// Map database row to Customer type
function mapDbToCustomer(row: any): Customer {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    secondaryPhone: row.secondary_phone,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    latitude: row.latitude,
    longitude: row.longitude,
    status: row.status,
    source: row.source,
    sourceDetails: row.source_details,
    assignedTo: row.assigned_to,
    notes: row.notes,
    tags: row.tags,
    propertyType: row.property_type,
    preferredContactMethod: row.preferred_contact_method,
    doNotCall: row.do_not_call,
    doNotText: row.do_not_text,
    doNotEmail: row.do_not_email,
    metadata: row.metadata,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}

// Create a new customer
export async function createCustomer(
  input: CreateCustomerInput,
  supabase?: SupabaseClient
): Promise<Customer | null> {
  const client = supabase || getServiceClient()

  const { data, error } = await client
    .from("customers")
    .insert({
      workspace_id: input.workspaceId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      secondary_phone: input.secondaryPhone,
      address: input.address,
      city: input.city,
      state: input.state,
      zip: input.zip,
      status: input.status || "lead",
      source: input.source,
      source_details: input.sourceDetails,
      assigned_to: input.assignedTo,
      notes: input.notes,
      tags: input.tags,
      property_type: input.propertyType,
      preferred_contact_method: input.preferredContactMethod || "any",
      metadata: input.metadata
    })
    .select()
    .single()

  if (error) {
    console.error("Failed to create customer:", error)
    return null
  }

  return mapDbToCustomer(data)
}

// Get customer by ID
export async function getCustomer(
  customerId: string,
  supabase?: SupabaseClient
): Promise<Customer | null> {
  const client = supabase || getServiceClient()

  const { data, error } = await client
    .from("customers")
    .select()
    .eq("id", customerId)
    .single()

  if (error) {
    console.error("Failed to get customer:", error)
    return null
  }

  return mapDbToCustomer(data)
}

// Update customer
export async function updateCustomer(
  customerId: string,
  input: UpdateCustomerInput,
  supabase?: SupabaseClient
): Promise<Customer | null> {
  const client = supabase || getServiceClient()

  const updateData: Record<string, any> = {}

  if (input.name !== undefined) updateData.name = input.name
  if (input.email !== undefined) updateData.email = input.email
  if (input.phone !== undefined) updateData.phone = input.phone
  if (input.secondaryPhone !== undefined) updateData.secondary_phone = input.secondaryPhone
  if (input.address !== undefined) updateData.address = input.address
  if (input.city !== undefined) updateData.city = input.city
  if (input.state !== undefined) updateData.state = input.state
  if (input.zip !== undefined) updateData.zip = input.zip
  if (input.status !== undefined) updateData.status = input.status
  if (input.source !== undefined) updateData.source = input.source
  if (input.sourceDetails !== undefined) updateData.source_details = input.sourceDetails
  if (input.assignedTo !== undefined) updateData.assigned_to = input.assignedTo
  if (input.notes !== undefined) updateData.notes = input.notes
  if (input.tags !== undefined) updateData.tags = input.tags
  if (input.propertyType !== undefined) updateData.property_type = input.propertyType
  if (input.preferredContactMethod !== undefined) updateData.preferred_contact_method = input.preferredContactMethod
  if (input.doNotCall !== undefined) updateData.do_not_call = input.doNotCall
  if (input.doNotText !== undefined) updateData.do_not_text = input.doNotText
  if (input.doNotEmail !== undefined) updateData.do_not_email = input.doNotEmail
  if (input.metadata !== undefined) updateData.metadata = input.metadata

  const { data, error } = await client
    .from("customers")
    .update(updateData)
    .eq("id", customerId)
    .select()
    .single()

  if (error) {
    console.error("Failed to update customer:", error)
    return null
  }

  return mapDbToCustomer(data)
}

// Delete customer
export async function deleteCustomer(
  customerId: string,
  supabase?: SupabaseClient
): Promise<boolean> {
  const client = supabase || getServiceClient()

  const { error } = await client
    .from("customers")
    .delete()
    .eq("id", customerId)

  if (error) {
    console.error("Failed to delete customer:", error)
    return false
  }

  return true
}

// List customers with filters
export async function listCustomers(
  workspaceId: string,
  filters?: CustomerFilters,
  pagination?: { page: number; pageSize: number },
  supabase?: SupabaseClient
): Promise<{ customers: Customer[]; total: number }> {
  const client = supabase || getServiceClient()
  const page = pagination?.page || 1
  const pageSize = pagination?.pageSize || 20
  const offset = (page - 1) * pageSize

  let query = client
    .from("customers")
    .select("*", { count: "exact" })
    .eq("workspace_id", workspaceId)

  // Apply filters
  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in("status", filters.status)
    } else {
      query = query.eq("status", filters.status)
    }
  }

  if (filters?.source) {
    if (Array.isArray(filters.source)) {
      query = query.in("source", filters.source)
    } else {
      query = query.eq("source", filters.source)
    }
  }

  if (filters?.assignedTo) {
    query = query.eq("assigned_to", filters.assignedTo)
  }

  if (filters?.propertyType) {
    query = query.eq("property_type", filters.propertyType)
  }

  if (filters?.tags && filters.tags.length > 0) {
    query = query.overlaps("tags", filters.tags)
  }

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,address.ilike.%${filters.search}%`
    )
  }

  if (filters?.dateRange) {
    query = query
      .gte("created_at", filters.dateRange.start.toISOString())
      .lte("created_at", filters.dateRange.end.toISOString())
  }

  // Apply pagination
  query = query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1)

  const { data, error, count } = await query

  if (error) {
    console.error("Failed to list customers:", error)
    return { customers: [], total: 0 }
  }

  return {
    customers: data.map(mapDbToCustomer),
    total: count || 0
  }
}

// Search customers
export async function searchCustomers(
  workspaceId: string,
  query: string,
  limit: number = 10,
  supabase?: SupabaseClient
): Promise<Customer[]> {
  const client = supabase || getServiceClient()

  const { data, error } = await client
    .from("customers")
    .select()
    .eq("workspace_id", workspaceId)
    .or(
      `name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,address.ilike.%${query}%`
    )
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Failed to search customers:", error)
    return []
  }

  return data.map(mapDbToCustomer)
}

// Get customer by phone number
export async function getCustomerByPhone(
  workspaceId: string,
  phone: string,
  supabase?: SupabaseClient
): Promise<Customer | null> {
  const client = supabase || getServiceClient()

  // Normalize phone number
  const normalized = phone.replace(/\D/g, "")

  const { data, error } = await client
    .from("customers")
    .select()
    .eq("workspace_id", workspaceId)
    .or(`phone.eq.${phone},phone.eq.+1${normalized},phone.eq.+${normalized}`)
    .single()

  if (error) {
    if (error.code !== "PGRST116") {
      // Not a "no rows" error
      console.error("Failed to get customer by phone:", error)
    }
    return null
  }

  return mapDbToCustomer(data)
}

// Get customer by email
export async function getCustomerByEmail(
  workspaceId: string,
  email: string,
  supabase?: SupabaseClient
): Promise<Customer | null> {
  const client = supabase || getServiceClient()

  const { data, error } = await client
    .from("customers")
    .select()
    .eq("workspace_id", workspaceId)
    .eq("email", email.toLowerCase())
    .single()

  if (error) {
    if (error.code !== "PGRST116") {
      console.error("Failed to get customer by email:", error)
    }
    return null
  }

  return mapDbToCustomer(data)
}

// Update customer status
export async function updateCustomerStatus(
  customerId: string,
  status: CustomerStatus,
  supabase?: SupabaseClient
): Promise<boolean> {
  const client = supabase || getServiceClient()

  const { error } = await client
    .from("customers")
    .update({ status })
    .eq("id", customerId)

  if (error) {
    console.error("Failed to update customer status:", error)
    return false
  }

  return true
}

// Add tag to customer
export async function addCustomerTag(
  customerId: string,
  tag: string,
  supabase?: SupabaseClient
): Promise<boolean> {
  const client = supabase || getServiceClient()

  // Get current tags
  const { data: customer } = await client
    .from("customers")
    .select("tags")
    .eq("id", customerId)
    .single()

  if (!customer) return false

  const currentTags = customer.tags || []
  if (currentTags.includes(tag)) return true

  const { error } = await client
    .from("customers")
    .update({ tags: [...currentTags, tag] })
    .eq("id", customerId)

  return !error
}

// Remove tag from customer
export async function removeCustomerTag(
  customerId: string,
  tag: string,
  supabase?: SupabaseClient
): Promise<boolean> {
  const client = supabase || getServiceClient()

  // Get current tags
  const { data: customer } = await client
    .from("customers")
    .select("tags")
    .eq("id", customerId)
    .single()

  if (!customer) return false

  const currentTags = customer.tags || []
  const newTags = currentTags.filter((t: string) => t !== tag)

  const { error } = await client
    .from("customers")
    .update({ tags: newTags })
    .eq("id", customerId)

  return !error
}
