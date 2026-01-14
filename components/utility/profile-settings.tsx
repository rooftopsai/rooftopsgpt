import { useChatbotUI } from "@/context/context"
import {
  PROFILE_CONTEXT_MAX,
  PROFILE_DISPLAY_NAME_MAX,
  PROFILE_USERNAME_MAX,
  PROFILE_USERNAME_MIN
} from "@/db/limits"
import { updateProfile } from "@/db/profile"
import { uploadProfileImage } from "@/db/storage/profile-images"
import { exportLocalStorageAsJSON } from "@/lib/export-old-data"
import { fetchOpenRouterModels } from "@/lib/models/fetch-models"
import { LLM_LIST_MAP } from "@/lib/models/llm/llm-list"
import { supabase } from "@/lib/supabase/browser-client"
import { cn } from "@/lib/utils"
import { OpenRouterLLM } from "@/types"
import {
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconFileDownload,
  IconLoader2,
  IconLogout,
  IconUser,
  IconCrown,
  IconHelp
} from "@tabler/icons-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  FC,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ChangeEvent
} from "react"
import { toast } from "sonner"
import { SIDEBAR_ICON_SIZE } from "../sidebar/sidebar-switcher"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { LimitDisplay } from "../ui/limit-display"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "../ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { TextareaAutosize } from "../ui/textarea-autosize"
import { WithTooltip } from "../ui/with-tooltip"
import { ThemeSwitcher } from "./theme-switcher"
import { UsageStats } from "../sidebar/usage-stats"

interface ProfileSettingsProps {}

export const ProfileSettings: FC<ProfileSettingsProps> = ({}) => {
  const {
    profile,
    setProfile,
    envKeyMap,
    setAvailableHostedModels,
    setAvailableOpenRouterModels,
    availableOpenRouterModels,
    userSubscription
  } = useChatbotUI()

  const router = useRouter()

  const buttonRef = useRef<HTMLButtonElement>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [usageRefreshKey, setUsageRefreshKey] = useState(0)
  const [isLoadingPortal, setIsLoadingPortal] = useState(false)

  const [displayName, setDisplayName] = useState(profile?.display_name || "")
  const [username, setUsername] = useState(profile?.username || "")
  const [usernameAvailable, setUsernameAvailable] = useState(true)
  const [loadingUsername, setLoadingUsername] = useState(false)
  const [profileImageSrc, setProfileImageSrc] = useState(
    profile?.image_url || ""
  )
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [profileInstructions, setProfileInstructions] = useState(
    profile?.profile_context || ""
  )

  const [useAzureOpenai, setUseAzureOpenai] = useState(
    profile?.use_azure_openai
  )
  const [openaiAPIKey, setOpenaiAPIKey] = useState(
    profile?.openai_api_key || ""
  )
  const [openaiOrgID, setOpenaiOrgID] = useState(
    profile?.openai_organization_id || ""
  )
  const [azureOpenaiAPIKey, setAzureOpenaiAPIKey] = useState(
    profile?.azure_openai_api_key || ""
  )
  const [azureOpenaiEndpoint, setAzureOpenaiEndpoint] = useState(
    profile?.azure_openai_endpoint || ""
  )
  const [azureOpenai35TurboID, setAzureOpenai35TurboID] = useState(
    profile?.azure_openai_35_turbo_id || ""
  )
  const [azureOpenai45TurboID, setAzureOpenai45TurboID] = useState(
    profile?.azure_openai_45_turbo_id || ""
  )
  const [azureOpenai45VisionID, setAzureOpenai45VisionID] = useState(
    profile?.azure_openai_45_vision_id || ""
  )
  const [azureEmbeddingsID, setAzureEmbeddingsID] = useState(
    profile?.azure_openai_embeddings_id || ""
  )
  const [anthropicAPIKey, setAnthropicAPIKey] = useState(
    profile?.anthropic_api_key || ""
  )
  const [googleGeminiAPIKey, setGoogleGeminiAPIKey] = useState(
    profile?.google_gemini_api_key || ""
  )
  const [mistralAPIKey, setMistralAPIKey] = useState(
    profile?.mistral_api_key || ""
  )
  const [groqAPIKey, setGroqAPIKey] = useState(profile?.groq_api_key || "")
  const [perplexityAPIKey, setPerplexityAPIKey] = useState(
    profile?.perplexity_api_key || ""
  )

  const [openrouterAPIKey, setOpenrouterAPIKey] = useState(
    profile?.openrouter_api_key || ""
  )

  const [userEmail, setUserEmail] = useState<string>("")

  // Fetch user email on mount
  useEffect(() => {
    const fetchUserEmail = async () => {
      const { data } = await supabase.auth.getUser()
      if (data?.user?.email) {
        setUserEmail(data.user.email)
      }
    }
    fetchUserEmail()
  }, [])

  // Refresh usage stats when profile panel opens
  useEffect(() => {
    if (isOpen) {
      setUsageRefreshKey(prev => prev + 1)
    }
  }, [isOpen])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
    return
  }

  const handleSave = async () => {
    if (!profile) return
    let profileImageUrl = profile.image_url
    let profileImagePath = ""

    if (profileImageFile) {
      try {
        const { path, url } = await uploadProfileImage(
          profile,
          profileImageFile
        )
        profileImageUrl = url ?? profileImageUrl
        profileImagePath = path
      } catch (error: any) {
        toast.error(error.message || "Failed to upload profile image")
        return
      }
    }

    const updatedProfile = await updateProfile(profile.id, {
      ...profile,
      display_name: displayName,
      username,
      profile_context: profileInstructions,
      image_url: profileImageUrl,
      image_path: profileImagePath
    })

    setProfile(updatedProfile)

    toast.success("Profile updated!")

    setIsOpen(false)
  }

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
        setUsernameAvailable(false)
        return
      }

      if (username.length > PROFILE_USERNAME_MAX) {
        setUsernameAvailable(false)
        return
      }

      const usernameRegex = /^[a-zA-Z0-9_]+$/
      if (!usernameRegex.test(username)) {
        setUsernameAvailable(false)
        toast.error(
          "Username must be letters, numbers, or underscores only - no other characters or spacing allowed."
        )
        return
      }

      setLoadingUsername(true)

      const response = await fetch(`/api/username/available`, {
        method: "POST",
        body: JSON.stringify({ username })
      })

      const data = await response.json()
      const isAvailable = data.isAvailable

      setUsernameAvailable(isAvailable)

      if (username === profile?.username) {
        setUsernameAvailable(true)
      }

      setLoadingUsername(false)
    }, 500),
    []
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      buttonRef.current?.click()
    }
  }

  if (!profile) return null

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {profile.image_url ? (
          <Image
            className="mt-2 size-[34px] cursor-pointer rounded-full hover:opacity-50"
            src={profile.image_url + "?" + new Date().getTime()}
            height={34}
            width={34}
            alt={"Image"}
          />
        ) : (
          <div className="mt-2 flex size-[34px] cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 transition-opacity hover:opacity-80">
            <IconUser size={20} className="text-white" stroke={2} />
          </div>
        )}
      </SheetTrigger>

      <SheetContent
        className="flex flex-col justify-between"
        side="left"
        onKeyDown={handleKeyDown}
      >
        <div className="grow overflow-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between space-x-2">
              <div>My Account</div>

              <Button
                tabIndex={-1}
                className="rounded-lg border-gray-200 bg-white from-transparent to-transparent text-xs shadow-none hover:bg-gray-50 hover:from-transparent hover:to-transparent dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                size="sm"
                onClick={handleSignOut}
              >
                <IconLogout className="mr-1" size={20} />
                Logout
              </Button>
            </SheetTitle>
          </SheetHeader>

          <Tabs defaultValue="profile">
            <TabsContent className="mt-4 space-y-4" value="profile">
              {userEmail && (
                <div className="space-y-1">
                  <Label>Email</Label>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800/50">
                    {userEmail}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Label>Your Name</Label>

                  <div className="text-xs">
                    {username !== profile.username ? (
                      usernameAvailable ? (
                        <div className="text-green-500">AVAILABLE</div>
                      ) : (
                        <div className="text-red-500">UNAVAILABLE</div>
                      )
                    ) : null}
                  </div>
                </div>

                <div className="relative">
                  <Input
                    className="rounded-lg border-gray-200 bg-white from-transparent to-transparent pr-10 shadow-none focus-visible:border-gray-300 dark:border-gray-700 dark:bg-gray-800/50"
                    placeholder="Username..."
                    value={username}
                    onChange={e => {
                      setUsername(e.target.value)
                      checkUsernameAvailability(e.target.value)
                    }}
                    minLength={PROFILE_USERNAME_MIN}
                    maxLength={PROFILE_USERNAME_MAX}
                  />

                  {username !== profile.username ? (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      {loadingUsername ? (
                        <IconLoader2 className="animate-spin" />
                      ) : usernameAvailable ? (
                        <IconCircleCheckFilled className="text-green-500" />
                      ) : (
                        <IconCircleXFilled className="text-red-500" />
                      )}
                    </div>
                  ) : null}
                </div>

                <LimitDisplay
                  used={username.length}
                  limit={PROFILE_USERNAME_MAX}
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label>Profile Image</Label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Auto-compressed
                  </span>
                </div>

                <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                  {/* Profile Image Preview */}
                  <div className="shrink-0">
                    {profileImageSrc ? (
                      <Image
                        className="rounded-full border-2 border-gray-200 shadow-sm dark:border-gray-600"
                        height={80}
                        width={80}
                        src={profileImageSrc}
                        alt="Profile"
                      />
                    ) : (
                      <div className="flex size-20 items-center justify-center rounded-full border-2 border-gray-200 bg-gradient-to-br from-cyan-500 to-blue-600 shadow-sm dark:border-gray-600">
                        <IconUser size={32} className="text-white" stroke={2} />
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className="flex flex-1 flex-col gap-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Choose a profile picture. Recommended: Square image, at
                      least 400x400px
                    </p>
                    <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
                      <svg
                        className="size-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      Choose File
                      <Input
                        className="hidden"
                        type="file"
                        accept="image/png, image/jpeg, image/jpg"
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          if (e.target.files) {
                            const file = e.target.files[0]
                            const url = URL.createObjectURL(file)
                            const img = new window.Image()
                            img.src = url

                            img.onload = () => {
                              const canvas = document.createElement("canvas")
                              const ctx = canvas.getContext("2d")

                              if (!ctx) {
                                toast.error("Unable to create canvas context.")
                                return
                              }

                              const size = Math.min(img.width, img.height)
                              const maxSize = 800
                              const targetSize = Math.min(size, maxSize)

                              canvas.width = targetSize
                              canvas.height = targetSize

                              ctx.drawImage(
                                img,
                                (img.width - size) / 2,
                                (img.height - size) / 2,
                                size,
                                size,
                                0,
                                0,
                                targetSize,
                                targetSize
                              )

                              const compressedDataUrl = canvas.toDataURL(
                                "image/jpeg",
                                0.85
                              )

                              canvas.toBlob(
                                blob => {
                                  if (blob) {
                                    const compressedFile = new File(
                                      [blob],
                                      file.name,
                                      {
                                        type: "image/jpeg",
                                        lastModified: Date.now()
                                      }
                                    )

                                    setProfileImageSrc(compressedDataUrl)
                                    setProfileImageFile(compressedFile)
                                  }
                                },
                                "image/jpeg",
                                0.85
                              )
                            }
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Chat Display Name</Label>

                <Input
                  className="rounded-lg border-gray-200 bg-white from-transparent to-transparent shadow-none focus-visible:border-gray-300 dark:border-gray-700 dark:bg-gray-800/50"
                  placeholder="Chat display name..."
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  maxLength={PROFILE_DISPLAY_NAME_MAX}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm">
                  What would you like the AI to know about you to provide better
                  responses?
                </Label>

                <TextareaAutosize
                  className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/50"
                  value={profileInstructions}
                  onValueChange={setProfileInstructions}
                  placeholder="Profile context... (optional)"
                  minRows={6}
                  maxRows={10}
                />

                <LimitDisplay
                  used={profileInstructions.length}
                  limit={PROFILE_CONTEXT_MAX}
                />
              </div>

              {/* Usage Stats */}
              <div className="mt-6">
                <UsageStats
                  refreshKey={usageRefreshKey}
                  className="border-t-0"
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="mt-6 space-y-4">
          {/* Subscription Management and Help */}
          <div className="space-y-3">
            {(userSubscription?.status === "active" || userSubscription?.status === "trialing" || userSubscription?.status === "past_due") && (
              <Button
                variant="outline"
                className="w-full rounded-lg border-gray-200 bg-white from-transparent to-transparent shadow-none hover:bg-gray-50 hover:from-transparent hover:to-transparent dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-700"
                disabled={isLoadingPortal}
                onClick={async () => {
                  setIsLoadingPortal(true)
                  try {
                    toast.loading("Opening billing portal...")
                    const response = await fetch("/api/stripe/portal", {
                      method: "POST"
                    })

                    if (!response.ok) {
                      const error = await response.json()
                      throw new Error(error.error || "Failed to open billing portal")
                    }

                    const { url } = await response.json()
                    if (url) {
                      toast.success("Redirecting to billing portal...")
                      window.location.href = url
                    } else {
                      throw new Error("No portal URL received")
                    }
                  } catch (error: any) {
                    console.error("Error opening billing portal:", error)
                    toast.error(error.message || "Failed to open billing portal. Please try again.")
                    setIsLoadingPortal(false)
                  }
                }}
              >
                {isLoadingPortal ? (
                  <IconLoader2 size={18} className="mr-2 animate-spin" />
                ) : (
                  <IconCrown size={18} className="mr-2" />
                )}
                Manage Subscription
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full rounded-lg border-gray-200 bg-white from-transparent to-transparent shadow-none hover:bg-gray-50 hover:from-transparent hover:to-transparent dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-700"
              onClick={() =>
                window.open("https://resources.rooftops.ai", "_blank")
              }
            >
              <IconHelp size={18} className="mr-2" />
              Get Help
            </Button>
          </div>

          {/* Bottom action bar */}
          <div className="flex items-center">
            <div className="flex items-center space-x-1">
              <ThemeSwitcher />

              <WithTooltip
                display={
                  <div>
                    Download Rooftops AI 1.0 data as JSON. Import coming soon!
                  </div>
                }
                trigger={
                  <IconFileDownload
                    className="cursor-pointer hover:opacity-50"
                    size={32}
                    onClick={exportLocalStorageAsJSON}
                  />
                }
              />
            </div>

            <div className="ml-auto space-x-2">
              <Button
                variant="ghost"
                className="rounded-lg"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>

              <Button
                ref={buttonRef}
                className="rounded-lg border-gray-200 bg-white from-transparent to-transparent shadow-none hover:bg-gray-50 hover:from-transparent hover:to-transparent dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
                onClick={handleSave}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
