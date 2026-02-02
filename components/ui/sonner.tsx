"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <>
      <style jsx global>{`
        @keyframes shimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }

        /* Toaster container positioning */
        [data-sonner-toaster] {
          position: fixed !important;
          top: 20px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          z-index: 9999 !important;
          width: fit-content !important;
          max-width: calc(100vw - 40px) !important;
        }

        @media (max-width: 640px) {
          [data-sonner-toaster] {
            top: 16px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            max-width: calc(100vw - 32px) !important;
          }
        }

        /* Custom toast styles - rebuild from scratch */
        .sonner-toast-custom {
          background: rgb(255, 255, 255) !important;
          color: #000000 !important;
          border-radius: 16px !important;
          padding: 14px 20px !important;
          display: flex !important;
          align-items: flex-start !important;
          justify-content: flex-start !important;
          gap: 12px !important;
          width: auto !important;
          min-width: 280px !important;
          max-width: 420px !important;
          margin: 0 auto 8px auto !important;
          box-shadow:
            0 10px 40px -10px rgba(0, 0, 0, 0.15),
            0 4px 20px -5px rgba(0, 0, 0, 0.1) !important;
          position: relative !important;
        }

        @media (max-width: 640px) {
          .sonner-toast-custom {
            max-width: calc(100vw - 32px) !important;
            min-width: 200px !important;
            padding: 12px 16px !important;
            border-radius: 14px !important;
          }
        }

        /* Subtle left border accent instead of shimmer */
        .sonner-toast-custom::before {
          content: "";
          position: absolute;
          left: 0;
          top: 8px;
          bottom: 8px;
          width: 3px;
          border-radius: 3px;
          background: linear-gradient(
            180deg,
            rgba(13, 148, 136, 0.8),
            rgba(59, 130, 246, 0.8)
          );
          pointer-events: none;
        }

        /* Title styling */
        .sonner-title-custom {
          font-size: 14px !important;
          font-weight: 600 !important;
          color: #111827 !important;
          text-align: left !important;
          user-select: none !important;
          line-height: 1.4 !important;
          margin: 0 !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          hyphens: auto !important;
        }

        @media (max-width: 640px) {
          .sonner-title-custom {
            font-size: 13px !important;
          }
        }

        /* Description styling */
        .sonner-description-custom {
          font-size: 13px !important;
          color: #4b5563 !important;
          text-align: left !important;
          user-select: none !important;
          line-height: 1.5 !important;
          margin: 4px 0 0 0 !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          hyphens: auto !important;
        }

        @media (max-width: 640px) {
          .sonner-description-custom {
            font-size: 12px !important;
          }
        }

        /* Icon styling */
        .sonner-icon-custom {
          flex-shrink: 0 !important;
          width: 20px !important;
          height: 20px !important;
        }

        @media (max-width: 640px) {
          .sonner-icon-custom {
            width: 18px !important;
            height: 18px !important;
          }
        }

        /* Icon colors by type - ONLY icons are colored, never the toast background */
        [data-type="success"] .sonner-icon-custom {
          color: rgb(34, 197, 94) !important;
        }

        [data-type="error"] .sonner-icon-custom {
          color: rgb(239, 68, 68) !important;
        }

        [data-type="info"] .sonner-icon-custom {
          color: rgb(59, 130, 246) !important;
        }

        [data-type="warning"] .sonner-icon-custom {
          color: rgb(251, 146, 60) !important;
        }

        /* Ensure toast background is ALWAYS white, never colored */
        [data-type="success"] .sonner-toast-custom,
        [data-type="error"] .sonner-toast-custom,
        [data-type="info"] .sonner-toast-custom,
        [data-type="warning"] .sonner-toast-custom {
          background: rgb(255, 255, 255) !important;
          color: #000000 !important;
        }

        /* Hide all unnecessary Sonner elements */
        [data-sonner-toast] [data-action],
        [data-sonner-toast] [data-cancel],
        [data-sonner-toast] [data-button],
        [data-sonner-toast] [data-close-button],
        .sonner-toast-custom [data-action],
        .sonner-toast-custom [data-cancel],
        .sonner-toast-custom [data-button],
        .sonner-toast-custom button:not([data-content]) {
          display: none !important;
        }

        /* Remove ALL focus outlines, borders, and rings from toast elements */
        [data-sonner-toast],
        [data-sonner-toast]:focus,
        [data-sonner-toast]:focus-visible,
        [data-sonner-toast]:focus-within,
        [data-sonner-toast]:active,
        [data-sonner-toast] *,
        .sonner-toast-custom,
        .sonner-toast-custom:focus,
        .sonner-toast-custom:focus-visible,
        .sonner-toast-custom:focus-within,
        .sonner-toast-custom:active,
        .sonner-toast-custom * {
          outline: none !important;
          outline-offset: 0 !important;
          border-color: transparent !important;
          --tw-ring-shadow: none !important;
          --tw-ring-offset-shadow: none !important;
          --tw-ring-color: transparent !important;
          --tw-ring-offset-color: transparent !important;
        }

        /* Maintain only the desired box-shadow */
        [data-sonner-toast],
        .sonner-toast-custom {
          box-shadow:
            0 10px 40px -10px rgba(0, 0, 0, 0.1),
            0 0 20px -5px rgba(59, 130, 246, 0.15),
            0 0 30px -10px rgba(16, 185, 129, 0.15) !important;
        }

        /* Prevent any focus ring from appearing on any child */
        [data-sonner-toaster] *:focus,
        [data-sonner-toaster] *:focus-visible,
        [data-sonner-toaster] *:focus-within {
          outline: none !important;
          --tw-ring-shadow: none !important;
          --tw-ring-offset-shadow: none !important;
        }

        /* Remove list item styling that might cause visual artifacts */
        [data-sonner-toaster] li,
        [data-sonner-toaster] ol {
          list-style: none !important;
          padding: 0 !important;
          margin: 0 !important;
        }
      `}</style>
      <Sonner
        position="top-center"
        closeButton={false}
        expand={false}
        richColors={false}
        visibleToasts={3}
        toastOptions={{
          unstyled: true,
          style: {},
          classNames: {
            toast: "sonner-toast-custom",
            title: "sonner-title-custom",
            description: "sonner-description-custom",
            icon: "sonner-icon-custom"
          }
        }}
        {...props}
      />
    </>
  )
}

export { Toaster }
