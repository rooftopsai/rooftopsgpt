"use client"

import { FC, useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { IconAlertTriangle, IconLoader2 } from "@tabler/icons-react"

interface ActionConfirmationProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  confirmationId: string
  toolName: string
  appName?: string
  message: string
  arguments?: Record<string, any>
  onConfirm: () => Promise<void>
  onCancel: () => void
}

export const ActionConfirmation: FC<ActionConfirmationProps> = ({
  open,
  onOpenChange,
  confirmationId,
  toolName,
  appName,
  message,
  arguments: args,
  onConfirm,
  onCancel
}) => {
  const [isConfirming, setIsConfirming] = useState(false)

  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      await onConfirm()
    } finally {
      setIsConfirming(false)
      onOpenChange(false)
    }
  }

  const handleCancel = () => {
    onCancel()
    onOpenChange(false)
  }

  // Format the tool name for display
  const displayToolName = toolName
    .replace(/_/g, " ")
    .replace(/\b\w/g, l => l.toUpperCase())

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <IconAlertTriangle className="size-5 text-yellow-500" />
            Confirm Action
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>{message}</p>

              <div className="bg-muted/50 rounded-lg border p-3">
                <div className="text-foreground mb-2 text-sm font-medium">
                  {displayToolName}
                  {appName && (
                    <span className="text-muted-foreground">
                      {" "}
                      via {appName}
                    </span>
                  )}
                </div>

                {args && Object.keys(args).length > 0 && (
                  <div className="space-y-1">
                    {Object.entries(args).map(([key, value]) => (
                      <div key={key} className="flex gap-2 text-xs">
                        <span className="text-muted-foreground">
                          {key.replace(/_/g, " ")}:
                        </span>
                        <span className="text-foreground truncate">
                          {typeof value === "object"
                            ? JSON.stringify(value)
                            : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-muted-foreground text-xs">
                This action will be executed using your connected app
                credentials.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isConfirming}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isConfirming}>
            {isConfirming ? (
              <>
                <IconLoader2 className="mr-2 size-4 animate-spin" />
                Executing...
              </>
            ) : (
              "Confirm"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
