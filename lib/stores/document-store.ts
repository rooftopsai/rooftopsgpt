// lib/stores/document-store.ts
"use client";

// Global store state
let isDocumentModeActive = false;
let documentContentText = '';
let isStreamingActive = false;
let currentDocumentId: string | null = null;
let documentHistory: {[key: string]: string} = {}; // Store documents by ID
let listeners: (() => void)[] = [];

if (typeof window !== 'undefined') {
    ensureSaveDocumentFunction();
  }

// Get current document ID
export function getCurrentDocumentId(): string | null {
  return currentDocumentId;
}

// Getter functions
export function getDocumentMode(): boolean {
  return isDocumentModeActive;
}

export function getDocumentContent(): string {
  return documentContentText;
}

export function getIsStreaming(): boolean {
  return isStreamingActive;
}

// Get a specific document by ID
export function getDocumentById(id: string): string | null {
  return documentHistory[id] || null;
}

// Get all saved documents
export function getAllDocuments(): {[key: string]: string} {
  return {...documentHistory};
}

// Save the current document with an ID
export function saveDocument(id: string): void {
  documentHistory[id] = documentContentText;
  currentDocumentId = id;
  notifyListeners();
}

// Load a document by ID
export function loadDocument(id: string): void {
  if (documentHistory[id]) {
    documentContentText = documentHistory[id];
    currentDocumentId = id;
    isDocumentModeActive = true;
    notifyListeners();
  }
}

// Setter functions
export function setDocumentMode(active: boolean): void {
    console.log(`Setting document mode: ${active} from caller:`, new Error().stack);
    isDocumentModeActive = active;
    notifyListeners();
  }

export function setDocumentContent(content: string): void {
  console.log(`Setting document content, length: ${content?.length || 0}`);
  documentContentText = content || '';
  if (currentDocumentId) {
    documentHistory[currentDocumentId] = documentContentText;
  }
  notifyListeners();
}

// Function to append to content during streaming
export function appendDocumentContent(newContent: string): void {
  documentContentText += newContent;
  if (currentDocumentId) {
    documentHistory[currentDocumentId] = documentContentText;
  }
  notifyListeners();
}

export function setIsStreaming(streaming: boolean): void {
  isStreamingActive = streaming;
  notifyListeners();
}

// Subscription management
export function subscribeToDocumentStore(callback: () => void): () => void {
  listeners.push(callback);
  // console.log(`Added listener, total: ${listeners.length}`);
  
  return () => {
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
      // console.log(`Removed listener, remaining: ${listeners.length}`);
    }
  };
}

function notifyListeners(): void {
  listeners.forEach(listener => {
    try {
      listener();
    } catch (error) {
      console.error('Error in document store listener:', error);
    }
  });
}

export function ensureSaveDocumentFunction() {
    if (typeof window !== 'undefined') {
      // Check if the function already exists
      if (typeof (window as any).saveDocument !== 'function') {
        // Add the saveDocument function to the window object for global access
        (window as any).saveDocument = (id: string) => {
          saveDocument(id);
          console.log(`Document saved with ID: ${id}`);
          return true;
        };
      }
    }
  }

// React hook
import { useState, useEffect } from 'react';


export function useDocumentStore() {
  const [isDocMode, setIsDocMode] = useState(isDocumentModeActive);
  const [documentContent, setDocContent] = useState(documentContentText);
  const [isStreaming, setIsStreaming] = useState(isStreamingActive);
  const [docId, setDocId] = useState(currentDocumentId);
  const [documents, setDocuments] = useState(documentHistory);
  
  useEffect(() => {
    const handleUpdate = () => {
      setIsDocMode(isDocumentModeActive);
      setDocContent(documentContentText);
      setIsStreaming(isStreamingActive);
      setDocId(currentDocumentId);
      setDocuments({...documentHistory});
    };
    
    const unsubscribe = subscribeToDocumentStore(handleUpdate);
    handleUpdate();
    return unsubscribe;
  }, []);
  
  return {
    isDocMode,
    documentContent,
    isStreaming,
    currentDocId: docId,
    documents,
    setDocumentMode,
    setDocumentContent,
    appendDocumentContent,
    setIsStreaming,
    saveDocument,
    loadDocument
  };
}