// components/utility/providers.tsx
"use client"

import { ThemeProvider } from "next-themes"
import { ChatbotUIProvider } from "@/context/context"

export function Providers({
  attribute,
  defaultTheme,
  children
}: {
  attribute: string
  defaultTheme: string
  children: React.ReactNode
}) {
  return (
    <ThemeProvider attribute={attribute} defaultTheme={defaultTheme}>
      {/* 🎯 Wrap here so all downstream client components get context */}
      <ChatbotUIProvider>
        {children}
      </ChatbotUIProvider>
    </ThemeProvider>
  )
}
