import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-light backdrop-blur-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "text-foreground border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 shadow-sm shadow-blue-500/10 hover:border-blue-500/30 hover:from-blue-500/20 hover:to-purple-500/20 hover:shadow-md dark:border-blue-400/25 dark:from-blue-400/15 dark:to-purple-400/15 dark:hover:border-blue-400/35 dark:hover:from-blue-400/25 dark:hover:to-purple-400/25",
        destructive:
          "border border-red-500/30 bg-gradient-to-br from-red-500/15 to-pink-500/15 text-red-700 shadow-sm shadow-red-500/10 hover:border-red-500/40 hover:from-red-500/25 hover:to-pink-500/25 hover:shadow-md dark:text-red-300",
        outline:
          "border border-blue-500/10 bg-white/5 shadow-sm hover:border-blue-500/20 hover:bg-gradient-to-br hover:from-blue-500/10 hover:to-purple-500/10 hover:shadow-md dark:border-blue-400/15 dark:bg-black/5 dark:hover:border-blue-400/25 dark:hover:from-blue-400/15 dark:hover:to-purple-400/15",
        secondary:
          "text-foreground border border-slate-500/10 bg-gradient-to-br from-slate-500/5 to-gray-500/5 shadow-sm hover:border-slate-500/20 hover:from-slate-500/10 hover:to-gray-500/10 dark:border-slate-400/15 dark:from-slate-400/10 dark:to-gray-400/10 dark:hover:border-slate-400/25 dark:hover:from-slate-400/15 dark:hover:to-gray-400/15",
        ghost:
          "border border-transparent hover:border-blue-500/15 hover:bg-gradient-to-br hover:from-blue-500/10 hover:to-purple-500/10 dark:hover:border-blue-400/20 dark:hover:from-blue-400/15 dark:hover:to-purple-400/15",
        link: "text-primary underline-offset-4 backdrop-blur-none hover:underline"
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-10 rounded-xl px-3",
        lg: "h-11 rounded-xl px-8",
        icon: "size-11"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
