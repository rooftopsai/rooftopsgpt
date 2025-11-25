import { supabase } from "@/lib/supabase/browser-client"
import { TablesInsert, TablesUpdate } from "@/supabase/types"

// Define special routes that should bypass normal database queries
const SPECIAL_ROUTES = ["explore"];

export const getPresetById = async (presetId: string) => {
  const { data: preset, error } = await supabase
    .from("presets")
    .select("*")
    .eq("id", presetId)
    .single()

  if (!preset) {
    throw new Error(error.message)
  }

  return preset
}

export const getPresetWorkspacesByWorkspaceId = async (workspaceId: string) => {
  // Check if workspaceId is a special route
  if (SPECIAL_ROUTES.includes(workspaceId)) {
    // Return a mock workspace for special routes
    return {
      id: "special",
      name: "Special Route",
      presets: []
    };
  }

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select(
      `
      id,
      name,
      presets (*)
    `
    )
    .eq("id", workspaceId)
    .single()

  if (!workspace) {
    throw new Error(error.message)
  }

  return workspace
}

export const getPresetWorkspacesByPresetId = async (presetId: string) => {
  const { data: preset, error } = await supabase
    .from("presets")
    .select(
      `
      id, 
      name, 
      workspaces (*)
    `
    )
    .eq("id", presetId)
    .single()

  if (!preset) {
    throw new Error(error.message)
  }

  return preset
}

export const createPreset = async (
  preset: TablesInsert<"presets">,
  workspace_id: string
) => {
  // Check if workspace_id is a special route
  if (SPECIAL_ROUTES.includes(workspace_id)) {
    throw new Error("Cannot create preset for special routes")
  }

  const { data: createdPreset, error } = await supabase
    .from("presets")
    .insert([preset])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  await createPresetWorkspace({
    user_id: preset.user_id,
    preset_id: createdPreset.id,
    workspace_id: workspace_id
  })

  return createdPreset
}

export const createPresets = async (
  presets: TablesInsert<"presets">[],
  workspace_id: string
) => {
  // Check if workspace_id is a special route
  if (SPECIAL_ROUTES.includes(workspace_id)) {
    throw new Error("Cannot create presets for special routes")
  }

  const { data: createdPresets, error } = await supabase
    .from("presets")
    .insert(presets)
    .select("*")

  if (error) {
    throw new Error(error.message)
  }

  await createPresetWorkspaces(
    createdPresets.map(preset => ({
      user_id: preset.user_id,
      preset_id: preset.id,
      workspace_id
    }))
  )

  return createdPresets
}

export const createPresetWorkspace = async (item: {
  user_id: string
  preset_id: string
  workspace_id: string
}) => {
  // Check if workspace_id is a special route
  if (SPECIAL_ROUTES.includes(item.workspace_id)) {
    throw new Error("Cannot create preset workspace for special routes")
  }

  const { data: createdPresetWorkspace, error } = await supabase
    .from("preset_workspaces")
    .insert([item])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdPresetWorkspace
}

export const createPresetWorkspaces = async (
  items: { user_id: string; preset_id: string; workspace_id: string }[]
) => {
  // Check if any workspace_id is a special route
  if (items.some(item => SPECIAL_ROUTES.includes(item.workspace_id))) {
    throw new Error("Cannot create preset workspaces for special routes")
  }

  const { data: createdPresetWorkspaces, error } = await supabase
    .from("preset_workspaces")
    .insert(items)
    .select("*")

  if (error) throw new Error(error.message)

  return createdPresetWorkspaces
}

export const updatePreset = async (
  presetId: string,
  preset: TablesUpdate<"presets">
) => {
  const { data: updatedPreset, error } = await supabase
    .from("presets")
    .update(preset)
    .eq("id", presetId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedPreset
}

export const deletePreset = async (presetId: string) => {
  const { error } = await supabase.from("presets").delete().eq("id", presetId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

export const deletePresetWorkspace = async (
  presetId: string,
  workspaceId: string
) => {
  // Check if workspaceId is a special route
  if (SPECIAL_ROUTES.includes(workspaceId)) {
    throw new Error("Cannot delete preset workspace for special routes")
  }

  const { error } = await supabase
    .from("preset_workspaces")
    .delete()
    .eq("preset_id", presetId)
    .eq("workspace_id", workspaceId)

  if (error) throw new Error(error.message)

  return true
}