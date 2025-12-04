import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  PROFILE_DISPLAY_NAME_MAX,
  PROFILE_USERNAME_MAX,
  PROFILE_USERNAME_MIN
} from "@/db/limits"
import {
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconLoader2
} from "@tabler/icons-react"
import { FC, useCallback, useState } from "react"
import { LimitDisplay } from "../ui/limit-display"
import { toast } from "sonner"

interface ProfileStepProps {
  username: string
  usernameAvailable: boolean
  displayName: string
  onUsernameAvailableChange: (isAvailable: boolean) => void
  onUsernameChange: (username: string) => void
  onDisplayNameChange: (name: string) => void
}

export const ProfileStep: FC<ProfileStepProps> = ({
  username,
  usernameAvailable,
  displayName,
  onUsernameAvailableChange,
  onUsernameChange,
  onDisplayNameChange
}) => {
  const [loading, setLoading] = useState(false)

  const debounce = (func: (...args: any[]) => void, wait: number) => {
    let timeout: NodeJS.Timeout | null

    return (...args: any[]) => {
      const later = () => {
        if (timeout) clearTimeout(timeout)
        func(...args)
      }

      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  const checkUsernameAvailability = useCallback(
    debounce(async (username: string) => {
      if (!username) return

      if (username.length < PROFILE_USERNAME_MIN) {
        onUsernameAvailableChange(false)
        return
      }

      if (username.length > PROFILE_USERNAME_MAX) {
        onUsernameAvailableChange(false)
        return
      }

      const usernameRegex = /^[a-zA-Z0-9_]+$/
      if (!usernameRegex.test(username)) {
        onUsernameAvailableChange(false)
        toast.error(
          "Username must be letters, numbers, or underscores only - no other characters or spacing allowed."
        )
        return
      }

      setLoading(true)

      const response = await fetch(`/api/username/available`, {
        method: "POST",
        body: JSON.stringify({ username })
      })

      const data = await response.json()
      const isAvailable = data.isAvailable

      onUsernameAvailableChange(isAvailable)

      setLoading(false)
    }, 500),
    []
  )

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Username</Label>
          <div className="text-xs font-medium">
            {usernameAvailable ? (
              <span className="text-emerald-600 dark:text-emerald-400">
                AVAILABLE
              </span>
            ) : (
              <span className="text-rose-600 dark:text-rose-400">
                UNAVAILABLE
              </span>
            )}
          </div>
        </div>

        <div className="relative">
          <Input
            className="h-12 rounded-lg border-zinc-300 pr-10 text-base dark:border-zinc-700"
            placeholder="username"
            value={username}
            onChange={e => {
              onUsernameChange(e.target.value)
              checkUsernameAvailability(e.target.value)
            }}
            minLength={PROFILE_USERNAME_MIN}
            maxLength={PROFILE_USERNAME_MAX}
          />

          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {loading ? (
              <IconLoader2 className="size-5 animate-spin text-cyan-600" />
            ) : usernameAvailable ? (
              <IconCircleCheckFilled className="size-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <IconCircleXFilled className="size-5 text-rose-600 dark:text-rose-400" />
            )}
          </div>
        </div>

        <LimitDisplay used={username.length} limit={PROFILE_USERNAME_MAX} />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold">Your Name</Label>

        <Input
          className="h-12 rounded-lg border-zinc-300 text-base dark:border-zinc-700"
          placeholder="Your Name"
          value={displayName}
          onChange={e => onDisplayNameChange(e.target.value)}
          maxLength={PROFILE_DISPLAY_NAME_MAX}
        />

        <LimitDisplay
          used={displayName.length}
          limit={PROFILE_DISPLAY_NAME_MAX}
        />
      </div>
    </>
  )
}
