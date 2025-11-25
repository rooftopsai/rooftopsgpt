"use client";

import React, { useEffect, useState, useRef } from "react";
import { Button } from "./button";
import { useDocumentStore } from "@/lib/stores/document-store";
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import dynamic from 'next/dynamic';
import 'easymde/dist/easymde.min.css';
import { Menu } from '@headlessui/react';
import { IconClock, IconChevronDown, IconFileText, IconEdit, IconCopy, IconX, IconCode } from '@tabler/icons-react';

// Dynamically import the editor to avoid SSR issues
const SimpleMDE = dynamic(() => import('react-simplemde-editor'), { ssr: false });

export function DocumentPanel() {
  const { 
    isDocMode, 
    documentContent, 
    isStreaming,
    documents, 
    currentDocId,
    setDocumentMode, 
    setDocumentContent,
    loadDocument 
  } = useDocumentStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isMobile, setIsMobile] = useState(false);
  const [viewMode, setViewMode] = useState<'markdown' | 'html'>('markdown');
  const [editorContent, setEditorContent] = useState("");
  
  // Reference to track if user is actively using the document panel
  const panelRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<any>(null);
  
  // Update editorContent when documentContent changes
  useEffect(() => {
    setEditorContent(documentContent || "");
  }, [documentContent]);
  
  // Check if the device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Detect theme
  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateTheme = (e: MediaQueryListEvent | MediaQueryList) => {
      setTheme(e.matches ? 'dark' : 'light');
    };
    
    updateTheme(darkModeMediaQuery);
    darkModeMediaQuery.addEventListener('change', updateTheme);
    
    return () => darkModeMediaQuery.removeEventListener('change', updateTheme);
  }, []);
  
  // Don't render the panel if document mode is off or if we're streaming with no content
  if (!isDocMode || (isStreaming && !documentContent)) return null;
  
  // Editor options 
  const editorOptions = {
    autofocus: false,
    spellChecker: true,
    toolbar: [
      'bold', 'italic', 'heading', '|', 
      'quote', 'unordered-list', 'ordered-list', '|',
      'link', 'image', 'table', 'code', '|',
      'preview', 'side-by-side', 'fullscreen', '|',
      'guide'
    ],
    status: ['lines', 'words', 'cursor'],
    placeholder: 'Edit your document here...',
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(documentContent || "");
    // Show a brief notification
    const notification = document.createElement("div");
    notification.innerText = "Copied to clipboard!";
    notification.style.position = "fixed";
    notification.style.bottom = "20px";
    notification.style.right = "20px";
    notification.style.padding = "10px 15px";
    notification.style.backgroundColor = "#4CAF50";
    notification.style.color = "white";
    notification.style.borderRadius = "4px";
    notification.style.zIndex = "9999";
    document.body.appendChild(notification);
    setTimeout(() => document.body.removeChild(notification), 2000);
  };
  
  // Toggle between Markdown and HTML view
  const toggleViewMode = () => {
    setViewMode(prev => prev === 'markdown' ? 'html' : 'markdown');
  };
  
  // Handle editor content change
  const handleEditorChange = (value: string) => {
    setEditorContent(value);
    setDocumentContent(value);
  };
  
  // Handle toggling edit mode
  const handleToggleEdit = () => {
    if (isEditing) {
      // Save changes when exiting edit mode
      setDocumentContent(editorContent);
    }
    setIsEditing(!isEditing);
  };
  
  return (
    <div 
      className="relative flex size-full flex-col overflow-hidden" 
      id="document-panel-container"
      ref={panelRef}
    >
      {/* Header - fixed height with shrink-0 to prevent it from shrinking */}
      <div className="flex max-h-[50px] min-h-[50px] shrink-0 items-center justify-between border-b-2 p-1 dark:border-gray-700">
        <div className="flex items-center">
          <IconFileText size={20} className="mr-2" />
          <h2 className="text-lg font-semibold">Document</h2>
          
          {/* Document history dropdown */}
          {Object.keys(documents).length > 1 && !isMobile && (
            <Menu as="div" className="relative ml-2">
              <Menu.Button className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-sm dark:bg-gray-700">
                <IconClock size={16} className="mr-1" />
                History
                <IconChevronDown size={16} className="ml-1" />
              </Menu.Button>
              <Menu.Items className="absolute left-0 z-20 mt-1 max-h-[300px] w-56 overflow-auto rounded-md border bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                {Object.keys(documents).map((docId) => (
                  <Menu.Item key={docId}>
                    {({active}) => (
                      <button
                        className={`${
                          active ? 'bg-gray-100 dark:bg-gray-700' : ''
                        } ${
                          docId === currentDocId ? 'font-bold' : ''
                        } w-full px-4 py-2 text-left text-sm`}
                        onClick={() => loadDocument(docId)}
                      >
                        Document {new Date(parseInt(docId.split('_')[1])).toLocaleString()}
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </Menu.Items>
            </Menu>
          )}
        </div>
        
        <div className="flex gap-2">
          {!isStreaming && !isEditing && (
            <Button 
              size="sm" 
              variant={viewMode === 'html' ? "default" : "outline"} 
              onClick={toggleViewMode}
              title={viewMode === 'markdown' ? "View as HTML" : "View as Markdown"}
            >
              <IconCode size={16} className={isMobile ? "" : "mr-1"} />
              {!isMobile && (viewMode === 'markdown' ? "HTML" : "Markdown")}
            </Button>
          )}
          {!isStreaming && (
            <Button 
              size="sm" 
              variant={isEditing ? "default" : "outline"} 
              onClick={handleToggleEdit}
            >
              <IconEdit size={16} className="mr-1" />
              {isEditing ? "Preview" : "Edit"}
            </Button>
          )}
          <Button size="sm" onClick={handleCopy}>
            <IconCopy size={16} className={isMobile ? "" : "mr-1"} />
            {!isMobile && "Copy"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDocumentMode(false)}>
            <IconX size={16} className={isMobile ? "" : "mr-1"} />
            {!isMobile && "Close"}
          </Button>
        </div>
      </div>
      
      {/* Content Area - flex-grow and overflow-auto */}
      <div className={`grow overflow-auto ${theme === 'dark' ? 'dark-mode' : ''}`}>
        {isStreaming ? (
          <div className="flex h-full flex-col items-center justify-center p-4">
            <div className="mb-4 size-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            <p className="text-gray-500 dark:text-gray-400">Generating your document...</p>
          </div>
        ) : isEditing ? (
          <div className="h-full overflow-hidden" id="editor-container">
            <SimpleMDE
              value={editorContent}
              onChange={handleEditorChange}
              options={{
                ...editorOptions,
                initialValue: documentContent || ""
              }}
              className={`h-full ${theme === 'dark' ? 'dark-theme-editor' : ''}`}
              events={{
                'change': (instance) => {
                  editorInstanceRef.current = instance;
                }
              }}
            />
          </div>
        ) : viewMode === 'html' ? (
          <div className="h-full overflow-auto bg-white p-4 dark:bg-gray-900">
            <div 
              className="prose prose-sm sm:prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: documentContent || "" }}
            />
          </div>
        ) : (
          <div className="h-full overflow-auto bg-white p-4 dark:bg-gray-900">
            <div className="prose prose-sm sm:prose dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]} // This enables HTML rendering
              >
                {documentContent || ""}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
      
      {/* Dark mode styles plus scrolling fixes */}
      <style jsx global>{`
        /* Fix for document panel rendering in multiple places */
        #document-panel-container:not(:first-of-type) {
          display: none !important;
        }
        
        /* Fix for SimpleMDE scrolling */
        #editor-container {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        
        .EasyMDEContainer {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          overflow: hidden;
        }
        
        .EasyMDEContainer .CodeMirror {
          height: auto !important;
          flex-grow: 1;
          min-height: 0;
          overflow: auto;
        }
        
        .EasyMDEContainer .CodeMirror-scroll {
          min-height: 0;
          max-height: 100%;
        }
        
        .dark-theme-editor .EasyMDEContainer {
          background-color: #FAFAFA;
        }
        
        .dark-theme-editor .CodeMirror {
          background-color: #FAFAFA;
          color: #222;
          border-color: #BBB;
        }
        
        .dark-theme-editor .editor-toolbar {
          background-color: #FAFAFA;
          border-color: #BBB;
          border-radius:0px;
        }
        
        .dark-theme-editor .editor-toolbar button {
          color: #222 !important;
        }
        
        .dark-theme-editor .editor-toolbar button:hover {
          background-color: #FAFAFA;
        }
        
        .dark-theme-editor .CodeMirror-cursor {
          border-color: #e5e7eb;
        }
        
        .dark-theme-editor .editor-statusbar {
          color: #222;
        }
        
        /* Add styles for SVG rendering */
        svg {
          max-width: 100%;
          height: auto;
        }
      `}</style>
    </div>
  );
}