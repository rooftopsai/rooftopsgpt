// Update TestDocButton.tsx
"use client"

import { Button } from "@/components/ui/button"; // Adjust path as needed
import { setDocumentMode, setDocumentContent } from "@/lib/stores/document-store"; // Adjust path as needed

export function TestDocButton() {
  const handleClick = () => {
    console.log("Test button clicked - activating document panel");
    
    // Create some test content
    const testContent = `# Test Document
    
This is a test document created by the test button.

## Features
- Shows that the document panel works
- Contains markdown formatting
- Has multiple paragraphs
    
You can edit this document in the document panel.`;
    
    // Set the document mode and content
    setDocumentMode(true);
    setDocumentContent(testContent);
  };

  return (
    <Button 
      onClick={handleClick}
      className="fixed bottom-4 right-4 z-50 rounded bg-blue-500 px-4 py-2 font-bold text-white"
    >
      Test Doc Panel
    </Button>
  );
}