//components > ui > documentManager.tsx

"use client";

import { useDocumentStore } from "@/lib/stores/document-store";
import { useEffect } from "react";

export function DocumentManager() {
  const { documents, loadDocument, setDocumentMode } = useDocumentStore();
  
  // Add keyboard shortcut Alt+D to open the last document
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'd') {
        const documentIds = Object.keys(documents);
        if (documentIds.length > 0) {
          // Get the most recent document (assuming IDs contain timestamps)
          const latestId = documentIds.sort().pop();
          if (latestId) {
            loadDocument(latestId);
            setDocumentMode(true);
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [documents, loadDocument, setDocumentMode]);
  
  // Optional: Render a floating button to reopen the last document
  const documentIds = Object.keys(documents);
  if (documentIds.length === 0) return null;
  
  return (
    <button
      onClick={() => {
        const latestId = documentIds.sort().pop();
        if (latestId) {
          loadDocument(latestId);
          setDocumentMode(true);
        }
      }}
      className="fixed bottom-4 right-4 z-30 rounded-full bg-blue-500 p-3 text-white shadow-lg hover:bg-blue-600"
      title="Open last document (Alt+D)"
    >
      <DocumentIcon className="size-6" />
    </button>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  );
}