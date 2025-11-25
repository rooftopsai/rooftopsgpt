import { supabase } from "@/lib/supabase/browser-client"
import { TablesInsert, TablesUpdate } from "@/supabase/types"

// Define special routes that should bypass normal database queries
const SPECIAL_ROUTES = ["explore"];

export const getFoldersByWorkspaceId = async (workspaceId: string) => {
  // Check if workspaceId is a special route
  if (SPECIAL_ROUTES.includes(workspaceId)) {
    // Return empty array for special routes
    return []
  }

  const { data: folders, error } = await supabase
    .from("folders")
    .select("*")
    .eq("workspace_id", workspaceId)

  if (!folders) {
    throw new Error(error.message)
  }

  return folders
}

export const createFolder = async (folder: TablesInsert<"folders">) => {
  // Check if workspace_id is a special route
  if (SPECIAL_ROUTES.includes(folder.workspace_id)) {
    throw new Error("Cannot create folder for special routes")
  }

  const { data: createdFolder, error } = await supabase
    .from("folders")
    .insert([folder])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdFolder
}

export const updateFolder = async (
  folderId: string,
  folder: TablesUpdate<"folders">
) => {
  const { data: updatedFolder, error } = await supabase
    .from("folders")
    .update(folder)
    .eq("id", folderId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedFolder
}

export const deleteFolder = async (folderId: string) => {
  const { error } = await supabase.from("folders").delete().eq("id", folderId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}