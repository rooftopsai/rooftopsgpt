// app/api/crm/customers/route.ts
// CRUD API for customers

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import {
  createCustomer,
  listCustomers,
  searchCustomers,
  CustomerFilters
} from "@/lib/crm/customers"

// GET /api/crm/customers - List or search customers
export async function GET(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Get current user
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    const search = searchParams.get("search")
    const status = searchParams.get("status")
    const source = searchParams.get("source")
    const page = parseInt(searchParams.get("page") || "1")
    const pageSize = parseInt(searchParams.get("pageSize") || "20")

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      )
    }

    // Verify user has access to workspace
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id")
      .eq("id", workspaceId)
      .eq("user_id", user.id)
      .single()

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      )
    }

    // If search query, use search function
    if (search && search.length >= 2) {
      const customers = await searchCustomers(
        workspaceId,
        search,
        pageSize,
        supabase
      )
      return NextResponse.json({ customers, total: customers.length })
    }

    // Build filters
    const filters: CustomerFilters = {}
    if (status) {
      filters.status = status.split(",") as any
    }
    if (source) {
      filters.source = source.split(",") as any
    }

    const result = await listCustomers(
      workspaceId,
      filters,
      { page, pageSize },
      supabase
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in GET /api/crm/customers:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/crm/customers - Create a new customer
export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Get current user
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { workspaceId, ...customerData } = body

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      )
    }

    if (!customerData.name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 })
    }

    // Verify user has access to workspace
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id")
      .eq("id", workspaceId)
      .eq("user_id", user.id)
      .single()

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      )
    }

    const customer = await createCustomer(
      { workspaceId, ...customerData },
      supabase
    )

    if (!customer) {
      return NextResponse.json(
        { error: "Failed to create customer" },
        { status: 500 }
      )
    }

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/crm/customers:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
