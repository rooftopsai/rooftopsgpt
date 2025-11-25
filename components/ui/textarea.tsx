import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full rounded-[5px] border border-blue-500/15 bg-gradient-to-br from-blue-500/5 to-purple-500/5 px-3 py-2 text-sm font-light shadow-sm shadow-blue-500/5 backdrop-blur-md transition-all focus-visible:border-blue-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-400/20 dark:from-blue-400/10 dark:to-purple-400/10 dark:focus-visible:border-blue-400/35",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
