import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "ring-offset-background placeholder:text-muted-foreground focus:none flex h-10 w-full rounded-xl border border-blue-500/15 bg-gradient-to-br from-blue-500/5 to-purple-500/5 px-3 py-2 text-sm font-light shadow-sm shadow-blue-500/5 backdrop-blur-md transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:border-blue-500/30 focus-visible:outline-none focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-400/20 dark:from-blue-400/10 dark:to-purple-400/10 dark:focus-visible:border-blue-400/35",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
