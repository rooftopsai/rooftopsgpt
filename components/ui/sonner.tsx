"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="top-center"
      icons={{
        success: (
          <div className="flex size-9 items-center justify-center rounded-full bg-green-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-5 text-gray-900"
            >
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        ),
        error: (
          <div className="flex size-9 items-center justify-center rounded-full bg-red-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-5 text-gray-900"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        ),
        warning: (
          <div className="flex size-9 items-center justify-center rounded-full bg-yellow-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-5 text-gray-900"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        ),
        info: (
          <div className="flex size-9 items-center justify-center rounded-full bg-blue-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-5 text-gray-900"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[#1F1F1F] group-[.toaster]:text-white group-[.toaster]:border-none group-[.toaster]:shadow-2xl group-[.toaster]:rounded-xl group-[.toaster]:px-6 group-[.toaster]:py-5 group-[.toaster]:min-h-[80px] group-[.toaster]:w-full group-[.toaster]:mx-0 group-[.toaster]:text-base group-[.toaster]:font-medium group-[.toaster]:flex group-[.toaster]:items-start group-[.toaster]:gap-4",
          description:
            "group-[.toast]:text-white/90 group-[.toast]:text-sm group-[.toast]:leading-relaxed group-[.toast]:mt-1",
          actionButton:
            "group-[.toast]:bg-red-600 group-[.toast]:text-white group-[.toast]:rounded-lg group-[.toast]:px-5 group-[.toast]:py-2.5 group-[.toast]:text-sm group-[.toast]:font-semibold group-[.toast]:hover:bg-red-700 group-[.toast]:transition-colors group-[.toast]:mt-3 group-[.toast]:w-full",
          cancelButton:
            "group-[.toast]:bg-white/10 group-[.toast]:text-white group-[.toast]:rounded-lg group-[.toast]:px-5 group-[.toast]:py-2.5 group-[.toast]:text-sm group-[.toast]:font-semibold group-[.toast]:hover:bg-white/20 group-[.toast]:transition-colors",
          error: "group-[.toaster]:bg-[#1F1F1F] group-[.toaster]:text-white",
          success: "group-[.toaster]:bg-[#1F1F1F] group-[.toaster]:text-white",
          warning: "group-[.toaster]:bg-[#1F1F1F] group-[.toaster]:text-white",
          info: "group-[.toaster]:bg-[#1F1F1F] group-[.toaster]:text-white",
          closeButton:
            "group-[.toast]:absolute group-[.toast]:right-4 group-[.toast]:top-4 group-[.toast]:bg-transparent group-[.toast]:text-white/50 group-[.toast]:border-none group-[.toast]:hover:text-white group-[.toast]:hover:bg-white/10 group-[.toast]:rounded-lg"
        }
      }}
      {...props}
    />
  )
}

export { Toaster }
