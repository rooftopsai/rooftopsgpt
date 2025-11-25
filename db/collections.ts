import { supabase } from "@/lib/supabase/browser-client"
import { TablesInsert, TablesUpdate } from "@/supabase/types"

// Define special routes that should bypass normal database queries
const SPECIAL_ROUTES = ["explore"];

export const getCollectionById = async (collectionId: string) => {
  const { data: collection, error } = await supabase
    .from("collections")
    .select("*")
    .eq("id", collectionId)
    .single()

  if (!collection) {
    throw new Error(error.message)
  }

  return collection
}

export const getCollectionWorkspacesByWorkspaceId = async (
  workspaceId: string
) => {
  // Check if workspaceId is a special route
  if (SPECIAL_ROUTES.includes(workspaceId)) {
    // Return a mock workspace for special routes
    return {
      id: "special",
      name: "Special Route",
      collections: []
    };
  }

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select(
      `
      id,
      name,
      collections (*)
    `
    )
    .eq("id", workspaceId)
    .single()

  if (!workspace) {
    throw new Error(error.message)
  }

  return workspace
}

export const getCollectionWorkspacesByCollectionId = async (
  collectionId: string
) => {
  const { data: collection, error } = await supabase
    .from("collections")
    .select(
      `
      id, 
      name, 
      workspaces (*)
    `
    )
    .eq("id", collectionId)
    .single()

  if (!collection) {
    throw new Error(error.message)
  }

  return collection
}

export const createCollection = async (
  collection: TablesInsert<"collections">,
  workspace_id: string
) => {
  // Check if workspace_id is a special route
  if (SPECIAL_ROUTES.includes(workspace_id)) {
    throw new Error("Cannot create collection for special routes")
  }

  const { data: createdCollection, error } = await supabase
    .from("collections")
    .insert([collection])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  await createCollectionWorkspace({
    user_id: createdCollection.user_id,
    collection_id: createdCollection.id,
    workspace_id
  })

  return createdCollection
}

export const createCollections = async (
  collections: TablesInsert<"collections">[],
  workspace_id: string
) => {
  // Check if workspace_id is a special route
  if (SPECIAL_ROUTES.includes(workspace_id)) {
    throw new Error("Cannot create collections for special routes")
  }

  const { data: createdCollections, error } = await supabase
    .from("collections")
    .insert(collections)
    .select("*")

  if (error) {
    throw new Error(error.message)
  }

  await createCollectionWorkspaces(
    createdCollections.map(collection => ({
      user_id: collection.user_id,
      collection_id: collection.id,
      workspace_id
    }))
  )

  return createdCollections
}

export const createCollectionWorkspace = async (item: {
  user_id: string
  collection_id: string
  workspace_id: string
}) => {
  // Check if workspace_id is a special route
  if (SPECIAL_ROUTES.includes(item.workspace_id)) {
    throw new Error("Cannot create collection workspace for special routes")
  }

  const { data: createdCollectionWorkspace, error } = await supabase
    .from("collection_workspaces")
    .insert([item])
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return createdCollectionWorkspace
}

export const createCollectionWorkspaces = async (
  items: { user_id: string; collection_id: string; workspace_id: string }[]
) => {
  // Check if any workspace_id is a special route
  if (items.some(item => SPECIAL_ROUTES.includes(item.workspace_id))) {
    throw new Error("Cannot create collection workspaces for special routes")
  }

  const { data: createdCollectionWorkspaces, error } = await supabase
    .from("collection_workspaces")
    .insert(items)
    .select("*")

  if (error) throw new Error(error.message)

  return createdCollectionWorkspaces
}

export const updateCollection = async (
  collectionId: string,
  collection: TablesUpdate<"collections">
) => {
  const { data: updatedCollection, error } = await supabase
    .from("collections")
    .update(collection)
    .eq("id", collectionId)
    .select("*")
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updatedCollection
}

export const deleteCollection = async (collectionId: string) => {
  const { error } = await supabase
    .from("collections")
    .delete()
    .eq("id", collectionId)

  if (error) {
    throw new Error(error.message)
  }

  return true
}

export const deleteCollectionWorkspace = async (
  collectionId: string,
  workspaceId: string
) => {
  // Check if workspaceId is a special route
  if (SPECIAL_ROUTES.includes(workspaceId)) {
    throw new Error("Cannot delete collection workspace for special routes")
  }

  const { error } = await supabase
    .from("collection_workspaces")
    .delete()
    .eq("collection_id", collectionId)
    .eq("workspace_id", workspaceId)

  if (error) throw new Error(error.message)

  return true
}