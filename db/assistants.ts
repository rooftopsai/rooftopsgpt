import { supabase } from "@/lib/supabase/browser-client"
import { TablesInsert, TablesUpdate } from "@/supabase/types"

// Special route paths that should bypass workspace lookup
const SPECIAL_ROUTES = ["explore"]

export const getAssistantById = async (assistantId: string) => {
  const { data: assistant, error } = await supabase
    .from("assistants")
    .select("*")
    .eq("id", assistantId)
    .single()

  if (!assistant) {
    throw new Error(error.message)
  }

  return assistant
}

export const getAssistantWorkspacesByWorkspaceId = async (
  workspaceId: string
) => {
  // Check if workspaceId is a special route
  if (SPECIAL_ROUTES.includes(workspaceId)) {
    // Return a mock workspace for special routes with empty assistants array
    return {
      id: "special",
      name: "Special Route",
      assistants: []
    }
  }

  try {
    const { data: workspace, error } = await supabase
      .from("workspaces")
      .select(
        `
        id,
        name,
        assistants (*)
      `
      )
      .eq("id", workspaceId)
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return workspace || { id: workspaceId, name: "", assistants: [] }
  } catch (error) {
    console.error(`Error fetching assistants for workspace: ${workspaceId}`, error)
    throw error
  }
}

export const getAssistantWorkspacesByAssistantId = async (
  assistantId: string
) => {
  const { data: assistant, error } = await supabase
    .from("assistants")
    .select(
      `
      id, 
      name, 
      workspaces (*)
    `
    )
    .eq("id", assistantId)
    .single()

  if (!assistant) {
    throw new Error(error.message)
  }

  return assistant
}

export const createAssistant = async (
  assistant: TablesInsert<"assistants">,
  workspace_id: string
) => {
  // Check if workspace_id is a special route
  if (SPECIAL_ROUTES.includes(workspace_id)) {
    throw new Error("Cannot create assistant for special routes")
  }

  const { data: createdAssistant, error } = await supabase
    .from("assistants")
    .insert([assistant])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  await createAssistantWorkspace({
    user_id: createdAssistant.user_id,
    assistant_id: createdAssistant.id,
    workspace_id
  })

  return createdAssistant
}

export const createAssistants = async (
  assistants: TablesInsert<"assistants">[],
  workspace_id: string
) => {
  // Check if workspace_id is a special route
  if (SPECIAL_ROUTES.includes(workspace_id)) {
    throw new Error("Cannot create assistants for special routes")
  }

  const { data: createdAssistants, error } = await supabase
    .from("assistants")
    .insert(assistants)
    .select("*")

  if (error) {
    throw new Error(error.message)
  }

  await createAssistantWorkspaces(
    createdAssistants.map(assistant => ({
      user_id: assistant.user_id,
      assistant_id: assistant.id,
      workspace_id
    }))
  )

  return createdAssistants
}

export const createAssistantWorkspace = async (item: {
  user_id: string
  assistant_id: string
  workspace_id: string
}) => {
  // Check if workspace_id is a special route
  if (SPECIAL_ROUTES.includes(item.workspace_id)) {
    throw new Error("Cannot create assistant workspace for special routes")
  }

  const { data: createdAssistantWorkspace, error } = await supabase
    .from("assistant_workspaces")
    .insert([item])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdAssistantWorkspace
}

export const createAssistantWorkspaces = async (
  items: { user_id: string; assistant_id: string; workspace_id: string }[]
) => {
  // Check if any workspace_id is a special route
  if (items.some(item => SPECIAL_ROUTES.includes(item.workspace_id))) {
    throw new Error("Cannot create assistant workspaces for special routes")
  }

  const { data: createdAssistantWorkspaces, error } = await supabase
    .from("assistant_workspaces")
    .insert(items)
    .select("*")

  if (error) throw new Error(error.message)

  return createdAssistantWorkspaces
}

export const updateAssistant = async (
  assistantId: string,
  assistant: TablesUpdate<"assistants">
) => {
  const { data: updatedAssistant, error } = await supabase
    .from("assistants")
    .update(assistant)
    .eq("id", assistantId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedAssistant
}

export const deleteAssistant = async (assistantId: string) => {
  const { error } = await supabase
    .from("assistants")
    .delete()
    .eq("id", assistantId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

export const deleteAssistantWorkspace = async (
  assistantId: string,
  workspaceId: string
) => {
  // Check if workspaceId is a special route
  if (SPECIAL_ROUTES.includes(workspaceId)) {
    throw new Error("Cannot delete assistant workspace for special routes")
  }

  const { error } = await supabase
    .from("assistant_workspaces")
    .delete()
    .eq("assistant_id", assistantId)
    .eq("workspace_id", workspaceId)

  if (error) throw new Error(error.message)

  return true
}