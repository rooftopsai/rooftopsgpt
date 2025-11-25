import { supabase } from "@/lib/supabase/browser-client"
import { TablesInsert, TablesUpdate } from "@/supabase/types"

// Special route paths that should bypass workspace lookup
const SPECIAL_ROUTES = ["explore"]

export const getHomeWorkspaceByUserId = async (userId: string) => {
  const { data: homeWorkspace, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("user_id", userId)
    .eq("is_home", true)
    .single()

  if (!homeWorkspace) {
    throw new Error(error.message)
  }

  return homeWorkspace.id
}

export const getWorkspaceById = async (workspaceId: string) => {
  // Check if the workspaceId is a special route
  if (SPECIAL_ROUTES.includes(workspaceId)) {
    // Return null or a placeholder workspace for special routes
    return {
      id: "special",
      name: "Special Route",
      description: "This is a special route, not a workspace",
      user_id: "system",
      is_home: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  // Regular workspace lookup logic
  try {
    const { data: workspace, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .single()

    if (error || !workspace) {
      throw new Error(error?.message || "Workspace not found")
    }

    return workspace
  } catch (error) {
    console.error("Error fetching workspace:", error)
    throw new Error(error.message)
  }
}

export const getWorkspacesByUserId = async (userId: string) => {
  const { data: workspaces, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (!workspaces) {
    throw new Error(error.message)
  }

  return workspaces
}

export const createWorkspace = async (
  workspace: TablesInsert<"workspaces">
) => {
  const { data: createdWorkspace, error } = await supabase
    .from("workspaces")
    .insert([workspace])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdWorkspace
}

export const updateWorkspace = async (
  workspaceId: string,
  workspace: TablesUpdate<"workspaces">
) => {
  // Prevent updating special routes
  if (SPECIAL_ROUTES.includes(workspaceId)) {
    throw new Error("Cannot update special route workspaces")
  }

  const { data: updatedWorkspace, error } = await supabase
    .from("workspaces")
    .update(workspace)
    .eq("id", workspaceId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedWorkspace
}

export const deleteWorkspace = async (workspaceId: string) => {
  // Prevent deleting special routes
  if (SPECIAL_ROUTES.includes(workspaceId)) {
    throw new Error("Cannot delete special route workspaces")
  }

  const { error } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", workspaceId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}