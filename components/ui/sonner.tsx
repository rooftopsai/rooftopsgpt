"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white dark:group-[.toaster]:bg-zinc-900 group-[.toaster]:text-zinc-900 dark:group-[.toaster]:text-zinc-100 group-[.toaster]:border-2 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-xl group-[.toaster]:backdrop-blur-sm",
          description:
            "group-[.toast]:text-zinc-600 dark:group-[.toast]:text-zinc-400 group-[.toast]:text-sm group-[.toast]:leading-relaxed",
          actionButton:
            "group-[.toast]:bg-zinc-900 dark:group-[.toast]:bg-zinc-100 group-[.toast]:text-white dark:group-[.toast]:text-zinc-900 group-[.toast]:rounded-lg group-[.toast]:px-4 group-[.toast]:py-2 group-[.toast]:text-sm group-[.toast]:font-semibold group-[.toast]:hover:bg-zinc-800 dark:group-[.toast]:hover:bg-zinc-200 group-[.toast]:transition-all group-[.toast]:hover:scale-105",
          cancelButton:
            "group-[.toast]:bg-zinc-100 dark:group-[.toast]:bg-zinc-800 group-[.toast]:text-zinc-900 dark:group-[.toast]:text-zinc-100 group-[.toast]:rounded-lg group-[.toast]:px-4 group-[.toast]:py-2 group-[.toast]:text-sm group-[.toast]:font-semibold group-[.toast]:hover:bg-zinc-200 dark:group-[.toast]:hover:bg-zinc-700 group-[.toast]:transition-all",
          error:
            "group-[.toaster]:bg-red-50 dark:group-[.toaster]:bg-red-950/50 group-[.toaster]:border-red-300 dark:group-[.toaster]:border-red-800",
          success:
            "group-[.toaster]:bg-emerald-50 dark:group-[.toaster]:bg-emerald-950/50 group-[.toaster]:border-emerald-300 dark:group-[.toaster]:border-emerald-800",
          warning:
            "group-[.toaster]:bg-amber-50 dark:group-[.toaster]:bg-amber-950/50 group-[.toaster]:border-amber-300 dark:group-[.toaster]:border-amber-800",
          info: "group-[.toaster]:bg-blue-50 dark:group-[.toaster]:bg-blue-950/50 group-[.toaster]:border-blue-300 dark:group-[.toaster]:border-blue-800"
        }
      }}
      {...props}
    />
  )
}

export { Toaster }
