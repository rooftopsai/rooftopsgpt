// components/TestDocPanel.tsx
"use client"

import { useDocumentStore } from "@/lib/stores/document-store" // Adjust path as needed

export function TestDocPanel() {
  console.log("TestDocPanel rendering attempt");
  
  const { isDocMode, documentContent } = useDocumentStore();
  
  console.log("TestDocPanel received from store:", { isDocMode, contentLength: documentContent.length });
  
  // Always render a small indicator regardless of isDocMode
  return (
    <>
      {/* This is always visible */}
      <div className="fixed right-4 top-4 z-50 rounded bg-yellow-300 p-2 text-black">
        DocPanel Status: {isDocMode ? "ACTIVE" : "inactive"}
      </div>
      
      {/* The actual panel only shows when isDocMode is true */}
      {isDocMode && (
        <div className="fixed right-0 top-0 z-20 flex h-full w-1/3 flex-col border-l bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="text-lg font-semibold">Document Test Panel</h2>
          </div>
          <div className="overflow-auto p-4">
            <pre className="whitespace-pre-wrap">{documentContent}</pre>
          </div>
        </div>
      )}
    </>
  );
}