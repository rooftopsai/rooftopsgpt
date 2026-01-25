// app/api/crm/customers/[id]/route.ts
// Individual customer CRUD operations

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import {
  getCustomer,
  updateCustomer,
  deleteCustomer
} from "@/lib/crm/customers"

// GET /api/crm/customers/[id] - Get a customer
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const customer = await getCustomer(params.id, supabase)

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // Verify user has access to this customer's workspace
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id")
      .eq("id", customer.workspaceId)
      .eq("user_id", user.id)
      .single()

    if (!workspace) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    return NextResponse.json(customer)
  } catch (error) {
    console.error("Error in GET /api/crm/customers/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PATCH /api/crm/customers/[id] - Update a customer
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get existing customer to verify access
    const existingCustomer = await getCustomer(params.id, supabase)

    if (!existingCustomer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // Verify user has access
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id")
      .eq("id", existingCustomer.workspaceId)
      .eq("user_id", user.id)
      .single()

    if (!workspace) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    const body = await request.json()
    const customer = await updateCustomer(params.id, body, supabase)

    if (!customer) {
      return NextResponse.json(
        { error: "Failed to update customer" },
        { status: 500 }
      )
    }

    return NextResponse.json(customer)
  } catch (error) {
    console.error("Error in PATCH /api/crm/customers/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/crm/customers/[id] - Delete a customer
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get existing customer to verify access
    const existingCustomer = await getCustomer(params.id, supabase)

    if (!existingCustomer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // Verify user has access
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id")
      .eq("id", existingCustomer.workspaceId)
      .eq("user_id", user.id)
      .single()

    if (!workspace) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    const success = await deleteCustomer(params.id, supabase)

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete customer" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/crm/customers/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
