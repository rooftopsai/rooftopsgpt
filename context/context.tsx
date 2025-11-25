"use client";

import { Tables } from "@/supabase/types";
import {
  ChatFile,
  ChatMessage,
  ChatSettings,
  LLM,
  MessageImage,
  OpenRouterLLM,
  WorkspaceImage
} from "@/types";
import { AssistantImage } from "@/types/images/assistant-image";
import { VALID_ENV_KEYS } from "@/types/valid-keys";
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useRef,
  useMemo,
  Dispatch,
  SetStateAction
} from "react";

// Create a singleton context instance to ensure there's only one
let globalContextInstance: ReturnType<typeof createChatbotContext> | null = null;

// Create context function
function createChatbotContext() {
  return createContext<ChatbotUIContextValue | null>(null);
}

// Get or create the singleton context
export function getChatbotUIContext() {
  if (!globalContextInstance) {
    globalContextInstance = createChatbotContext();
  }
  return globalContextInstance;
}

// Use the singleton context
export const ChatbotUIContext = getChatbotUIContext();

// Type for context value
interface ChatbotUIContextValue {
  // PROFILE STORE
  profile: Tables<"profiles"> | null;
  setProfile: Dispatch<SetStateAction<Tables<"profiles"> | null>>;

  // SUBSCRIPTION STORE
  userSubscription: Tables<"subscriptions"> | null;
  setUserSubscription: Dispatch<SetStateAction<Tables<"subscriptions"> | null>>;

  // ITEMS STORE
  assistants: Tables<"assistants">[];
  setAssistants: Dispatch<SetStateAction<Tables<"assistants">[]>>;
  collections: Tables<"collections">[];
  setCollections: Dispatch<SetStateAction<Tables<"collections">[]>>;
  chats: Tables<"chats">[];
  setChats: Dispatch<SetStateAction<Tables<"chats">[]>>;
  files: Tables<"files">[];
  setFiles: Dispatch<SetStateAction<Tables<"files">[]>>;
  folders: Tables<"folders">[];
  setFolders: Dispatch<SetStateAction<Tables<"folders">[]>>;
  models: Tables<"models">[];
  setModels: Dispatch<SetStateAction<Tables<"models">[]>>;
  presets: Tables<"presets">[];
  setPresets: Dispatch<SetStateAction<Tables<"presets">[]>>;
  prompts: Tables<"prompts">[];
  setPrompts: Dispatch<SetStateAction<Tables<"prompts">[]>>;
  tools: Tables<"tools">[];
  setTools: Dispatch<SetStateAction<Tables<"tools">[]>>;
  workspaces: Tables<"workspaces">[];
  setWorkspaces: Dispatch<SetStateAction<Tables<"workspaces">[]>>;

  // MODELS STORE
  envKeyMap: Record<string, VALID_ENV_KEYS>;
  setEnvKeyMap: Dispatch<SetStateAction<Record<string, VALID_ENV_KEYS>>>;
  availableHostedModels: LLM[];
  setAvailableHostedModels: Dispatch<SetStateAction<LLM[]>>;
  availableLocalModels: LLM[];
  setAvailableLocalModels: Dispatch<SetStateAction<LLM[]>>;
  availableOpenRouterModels: OpenRouterLLM[];
  setAvailableOpenRouterModels: Dispatch<SetStateAction<OpenRouterLLM[]>>;

  // WORKSPACE STORE
  selectedWorkspace: Tables<"workspaces"> | null;
  setSelectedWorkspace: Dispatch<SetStateAction<Tables<"workspaces"> | null>>;
  workspaceImages: WorkspaceImage[];
  setWorkspaceImages: Dispatch<SetStateAction<WorkspaceImage[]>>;

  // PRESET STORE
  selectedPreset: Tables<"presets"> | null;
  setSelectedPreset: Dispatch<SetStateAction<Tables<"presets"> | null>>;

  // ASSISTANT STORE
  selectedAssistant: Tables<"assistants"> | null;
  setSelectedAssistant: Dispatch<SetStateAction<Tables<"assistants"> | null>>;
  assistantImages: AssistantImage[];
  setAssistantImages: Dispatch<SetStateAction<AssistantImage[]>>;
  openaiAssistants: any[];
  setOpenaiAssistants: Dispatch<SetStateAction<any[]>>;

  // PASSIVE CHAT STORE
  userInput: string;
  setUserInput: Dispatch<SetStateAction<string>>;
  chatMessages: ChatMessage[];
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  chatSettings: ChatSettings | null;
  setChatSettings: Dispatch<SetStateAction<ChatSettings | null>>;
  selectedChat: Tables<"chats"> | null;
  setSelectedChat: Dispatch<SetStateAction<Tables<"chats"> | null>>;
  chatFileItems: Tables<"file_items">[];
  setChatFileItems: Dispatch<SetStateAction<Tables<"file_items">[]>>;

  // ACTIVE CHAT STORE
  abortController: AbortController | null;
  setAbortController: Dispatch<SetStateAction<AbortController | null>>;
  firstTokenReceived: boolean;
  setFirstTokenReceived: Dispatch<SetStateAction<boolean>>;
  isGenerating: boolean;
  setIsGenerating: Dispatch<SetStateAction<boolean>>;

  // CHAT INPUT COMMAND STORE
  isPromptPickerOpen: boolean;
  setIsPromptPickerOpen: Dispatch<SetStateAction<boolean>>;
  slashCommand: string;
  setSlashCommand: Dispatch<SetStateAction<string>>;
  isFilePickerOpen: boolean;
  setIsFilePickerOpen: Dispatch<SetStateAction<boolean>>;
  hashtagCommand: string;
  setHashtagCommand: Dispatch<SetStateAction<string>>;
  isToolPickerOpen: boolean;
  setIsToolPickerOpen: Dispatch<SetStateAction<boolean>>;
  toolCommand: string;
  setToolCommand: Dispatch<SetStateAction<string>>;
  focusPrompt: boolean;
  setFocusPrompt: Dispatch<SetStateAction<boolean>>;
  focusFile: boolean;
  setFocusFile: Dispatch<SetStateAction<boolean>>;
  focusTool: boolean;
  setFocusTool: Dispatch<SetStateAction<boolean>>;
  focusAssistant: boolean;
  setFocusAssistant: Dispatch<SetStateAction<boolean>>;
  atCommand: string;
  setAtCommand: Dispatch<SetStateAction<string>>;
  isAssistantPickerOpen: boolean;
  setIsAssistantPickerOpen: Dispatch<SetStateAction<boolean>>;

  // ATTACHMENTS STORE
  chatFiles: ChatFile[];
  setChatFiles: Dispatch<SetStateAction<ChatFile[]>>;
  chatImages: MessageImage[];
  setChatImages: Dispatch<SetStateAction<MessageImage[]>>;
  newMessageFiles: ChatFile[];
  setNewMessageFiles: Dispatch<SetStateAction<ChatFile[]>>;
  newMessageImages: MessageImage[];
  setNewMessageImages: Dispatch<SetStateAction<MessageImage[]>>;
  showFilesDisplay: boolean;
  setShowFilesDisplay: Dispatch<SetStateAction<boolean>>;

  // RETRIEVAL STORE
  useRetrieval: boolean;
  setUseRetrieval: Dispatch<SetStateAction<boolean>>;
  sourceCount: number;
  setSourceCount: Dispatch<SetStateAction<number>>;

  // TOOL STORE
  selectedTools: Tables<"tools">[];
  setSelectedTools: Dispatch<SetStateAction<Tables<"tools">[]>>;
  toolInUse: string;
  setToolInUse: Dispatch<SetStateAction<string>>;

  // DOCUMENT MODE STORE
  isDocMode: boolean;
  setIsDocMode: Dispatch<SetStateAction<boolean>>;
  documentContent: string;
  setDocumentContent: Dispatch<SetStateAction<string>>;
}

interface ChatbotUIProviderProps {
  children: ReactNode;
}

// Component that provides context to the entire app
export function ChatbotUIProvider({ children }: ChatbotUIProviderProps) {
  const instanceIdRef = useRef(Math.random().toString(36).substring(7));
  console.log(`ChatbotUIProvider rendering (instance: ${instanceIdRef.current})`);
  
  // PROFILE STORE
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);

  // SUBSCRIPTION STORE
  const [userSubscription, setUserSubscription] = useState<Tables<"subscriptions"> | null>(null);

  // ITEMS STORE
  const [assistants, setAssistants] = useState<Tables<"assistants">[]>([]);
  const [collections, setCollections] = useState<Tables<"collections">[]>([]);
  const [chats, setChats] = useState<Tables<"chats">[]>([]);
  const [files, setFiles] = useState<Tables<"files">[]>([]);
  const [folders, setFolders] = useState<Tables<"folders">[]>([]);
  const [models, setModels] = useState<Tables<"models">[]>([]);
  const [presets, setPresets] = useState<Tables<"presets">[]>([]);
  const [prompts, setPrompts] = useState<Tables<"prompts">[]>([]);
  const [tools, setTools] = useState<Tables<"tools">[]>([]);
  const [workspaces, setWorkspaces] = useState<Tables<"workspaces">[]>([]);

  // MODELS STORE
  const [envKeyMap, setEnvKeyMap] = useState<Record<string, VALID_ENV_KEYS>>({});
  const [availableHostedModels, setAvailableHostedModels] = useState<LLM[]>([]);
  const [availableLocalModels, setAvailableLocalModels] = useState<LLM[]>([]);
  const [availableOpenRouterModels, setAvailableOpenRouterModels] = useState<OpenRouterLLM[]>([]);

  // WORKSPACE STORE
  const [selectedWorkspace, setSelectedWorkspace] = useState<Tables<"workspaces"> | null>(null);
  const [workspaceImages, setWorkspaceImages] = useState<WorkspaceImage[]>([]);

  // PRESET STORE
  const [selectedPreset, setSelectedPreset] = useState<Tables<"presets"> | null>(null);

  // ASSISTANT STORE
  const [selectedAssistant, setSelectedAssistant] = useState<Tables<"assistants"> | null>(null);
  const [assistantImages, setAssistantImages] = useState<AssistantImage[]>([]);
  const [openaiAssistants, setOpenaiAssistants] = useState<any[]>([]);

  // PASSIVE CHAT STORE
  const [userInput, setUserInput] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatSettings, setChatSettings] = useState<ChatSettings | null>(null);
  const [selectedChat, setSelectedChat] = useState<Tables<"chats"> | null>(null);
  const [chatFileItems, setChatFileItems] = useState<Tables<"file_items">[]>([]);

  // ACTIVE CHAT STORE
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [firstTokenReceived, setFirstTokenReceived] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // CHAT INPUT COMMAND STORE
  const [isPromptPickerOpen, setIsPromptPickerOpen] = useState<boolean>(false);
  const [slashCommand, setSlashCommand] = useState<string>("");
  const [isFilePickerOpen, setIsFilePickerOpen] = useState<boolean>(false);
  const [hashtagCommand, setHashtagCommand] = useState<string>("");
  const [isToolPickerOpen, setIsToolPickerOpen] = useState<boolean>(false);
  const [toolCommand, setToolCommand] = useState<string>("");
  const [focusPrompt, setFocusPrompt] = useState<boolean>(false);
  const [focusFile, setFocusFile] = useState<boolean>(false);
  const [focusTool, setFocusTool] = useState<boolean>(false);
  const [focusAssistant, setFocusAssistant] = useState<boolean>(false);
  const [atCommand, setAtCommand] = useState<string>("");
  const [isAssistantPickerOpen, setIsAssistantPickerOpen] = useState<boolean>(false);

  // ATTACHMENTS STORE
  const [chatFiles, setChatFiles] = useState<ChatFile[]>([]);
  const [chatImages, setChatImages] = useState<MessageImage[]>([]);
  const [newMessageFiles, setNewMessageFiles] = useState<ChatFile[]>([]);
  const [newMessageImages, setNewMessageImages] = useState<MessageImage[]>([]);
  const [showFilesDisplay, setShowFilesDisplay] = useState<boolean>(false);

  // RETRIEVAL STORE
  const [useRetrieval, setUseRetrieval] = useState<boolean>(false);
  const [sourceCount, setSourceCount] = useState<number>(4);

  // TOOL STORE
  const [selectedTools, setSelectedTools] = useState<Tables<"tools">[]>([]);
  const [toolInUse, setToolInUse] = useState<string>("none");

  // DOCUMENT MODE STORE - explicitly defined and initialized
  const [isDocMode, setIsDocMode] = useState<boolean>(false);
  const [documentContent, setDocumentContent] = useState<string>("");

  // Debug logs
  // console.log(`Document mode state in provider ${instanceIdRef.current}:`, {
  //   isDocMode,
  //   documentContent: documentContent.substring(0, 20),
  //   setIsDocModeType: typeof setIsDocMode,
  //   setDocumentContentType: typeof setDocumentContent
  // });

  // Create value object with useMemo to prevent unnecessary rerenders
  const contextValue = useMemo(() => ({
    // PROFILE STORE
    profile, setProfile,

    // SUBSCRIPTION STORE
    userSubscription, setUserSubscription,

    // ITEMS STORE
    assistants, setAssistants,
    collections, setCollections,
    chats, setChats,
    files, setFiles,
    folders, setFolders,
    models, setModels,
    presets, setPresets,
    prompts, setPrompts,
    tools, setTools,
    workspaces, setWorkspaces,
    
    // MODELS STORE
    envKeyMap, setEnvKeyMap,
    availableHostedModels, setAvailableHostedModels,
    availableLocalModels, setAvailableLocalModels,
    availableOpenRouterModels, setAvailableOpenRouterModels,
    
    // WORKSPACE STORE
    selectedWorkspace, setSelectedWorkspace,
    workspaceImages, setWorkspaceImages,
    
    // PRESET STORE
    selectedPreset, setSelectedPreset,
    
    // ASSISTANT STORE
    selectedAssistant, setSelectedAssistant,
    assistantImages, setAssistantImages,
    openaiAssistants, setOpenaiAssistants,
    
    // PASSIVE CHAT STORE
    userInput, setUserInput,
    chatMessages, setChatMessages,
    chatSettings, setChatSettings,
    selectedChat, setSelectedChat,
    chatFileItems, setChatFileItems,
    
    // ACTIVE CHAT STORE
    abortController, setAbortController,
    firstTokenReceived, setFirstTokenReceived,
    isGenerating, setIsGenerating,
    
    // CHAT INPUT COMMAND STORE
    isPromptPickerOpen, setIsPromptPickerOpen,
    slashCommand, setSlashCommand,
    isFilePickerOpen, setIsFilePickerOpen,
    hashtagCommand, setHashtagCommand,
    isToolPickerOpen, setIsToolPickerOpen,
    toolCommand, setToolCommand,
    focusPrompt, setFocusPrompt,
    focusFile, setFocusFile,
    focusTool, setFocusTool,
    focusAssistant, setFocusAssistant,
    atCommand, setAtCommand,
    isAssistantPickerOpen, setIsAssistantPickerOpen,
    
    // ATTACHMENTS STORE
    chatFiles, setChatFiles,
    chatImages, setChatImages,
    newMessageFiles, setNewMessageFiles,
    newMessageImages, setNewMessageImages,
    showFilesDisplay, setShowFilesDisplay,
    
    // RETRIEVAL STORE
    useRetrieval, setUseRetrieval,
    sourceCount, setSourceCount,
    
    // TOOL STORE
    selectedTools, setSelectedTools,
    toolInUse, setToolInUse,
    
    // DOCUMENT MODE - explicitly included
    isDocMode, setIsDocMode,
    documentContent, setDocumentContent
  }), [
    // Dependencies for useMemo - list all state variables
    profile,
    userSubscription,
    assistants, collections, chats, files, folders, models, presets, prompts, tools, workspaces,
    envKeyMap, availableHostedModels, availableLocalModels, availableOpenRouterModels,
    selectedWorkspace, workspaceImages,
    selectedPreset,
    selectedAssistant, assistantImages, openaiAssistants,
    userInput, chatMessages, chatSettings, selectedChat, chatFileItems,
    abortController, firstTokenReceived, isGenerating,
    isPromptPickerOpen, slashCommand, isFilePickerOpen, hashtagCommand, isToolPickerOpen,
    toolCommand, focusPrompt, focusFile, focusTool, focusAssistant, atCommand, isAssistantPickerOpen,
    chatFiles, chatImages, newMessageFiles, newMessageImages, showFilesDisplay,
    useRetrieval, sourceCount,
    selectedTools, toolInUse,
    // IMPORTANT: Include document mode state
    isDocMode, documentContent
  ]);

  return (
    <ChatbotUIContext.Provider value={contextValue}>
      {children}
    </ChatbotUIContext.Provider>
  );
}

// Custom hook to safely access context
export function useChatbotUI() {
  const context = useContext(ChatbotUIContext);

  if (!context) {
    console.error("useChatbotUI must be used within ChatbotUIProvider");
    
    // Create a minimal fallback object with just the essential properties
    const fallback: Partial<ChatbotUIContextValue> = {
      // DOCUMENT MODE
      isDocMode: false,
      documentContent: "",
      setIsDocMode: (...args: any) => {
        console.error("setIsDocMode called outside provider", args);
      },
      setDocumentContent: (...args: any) => {
        console.error("setDocumentContent called outside provider", args);
      },
      
      // Basic fallbacks for commonly used props
      profile: null,
      setProfile: () => console.error("setProfile called outside provider"),
      chatMessages: [],
      setChatMessages: () => console.error("setChatMessages called outside provider"),
      userInput: "",
      setUserInput: () => console.error("setUserInput called outside provider"),
      
      // Add minimal implementations for other required properties
      // This is just a fallback to prevent crashes
    };
    
    // Return the fallback as any to bypass type checking
    // This is safer than an incomplete type assertion
    return fallback as any;
  }
  
  return context;
}