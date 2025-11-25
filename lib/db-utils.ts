// lib/db-utils.ts

// Define special routes that should bypass normal database queries
export const SPECIAL_ROUTES = ["explore"];

/**
 * Safely executes a database query function involving workspace IDs
 * Returns a default value for special routes instead of executing the query
 */
export const safeWorkspaceQuery = async <T>(
  workspaceId: string,
  queryFn: (id: string) => Promise<T>,
  defaultValue: T
): Promise<T> => {
  // Check if workspaceId is a special route
  if (SPECIAL_ROUTES.includes(workspaceId)) {
    // Return the default value without executing the query
    return defaultValue;
  }
  
  // Execute the actual query function with the workspace ID
  return await queryFn(workspaceId);
};