// lib/property/types.ts

import { Tables } from "@/supabase/types";

// Extend the Messages type to include reportData
export type MessageWithReport = Tables<"messages"> & {
  reportData?: any;
};

// You could also define more specific property-related types here if needed
export interface PropertyReportData {
  markdown: string;
  htmlContent: string;
  jsonData: any;
}