// @ts-nocheck
import { Brand } from "@/components/ui/brand"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SubmitButton } from "@/components/ui/submit-button"
import { createClient } from "@/lib/supabase/server"
import { Database } from "@/supabase/types"
import { createServerClient } from "@supabase/ssr"
import { get } from "@vercel/edge-config"
import { Metadata } from "next"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import dynamic from "next/dynamic"

const TypewriterText = dynamic(
  () => import("@/components/ui/typewriter-text"),
  {
    ssr: false
  }
)

export const metadata: Metadata = {
  title: "Login"
}

export default async function Login({
  searchParams
}: {
  searchParams: { message: string; type?: string }
}) {
  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        }
      }
    }
  )
  const session = (await supabase.auth.getSession()).data.session

  if (session) {
    const { data: homeWorkspace, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("is_home", true)
      .single()

    if (!homeWorkspace) {
      throw new Error(error.message)
    }

    return redirect(`/${(homeWorkspace as any).id}/chat`)
  }

  const signIn = async (formData: FormData) => {
    "use server"

    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      return redirect(`/login?message=${error.message}`)
    }

    const { data: homeWorkspace, error: homeWorkspaceError } = await supabase
      .from("workspaces")
      .select("*")
      .eq("user_id", data.user.id)
      .eq("is_home", true)
      .single()

    if (!homeWorkspace) {
      throw new Error(
        homeWorkspaceError?.message || "An unexpected error occurred"
      )
    }

    return redirect(`/${(homeWorkspace as any).id}/chat`)
  }

  const getEnvVarOrEdgeConfigValue = async (name: string) => {
    "use server"
    if (process.env.EDGE_CONFIG) {
      return await get<string>(name)
    }

    return process.env[name]
  }

  const signUp = async (formData: FormData) => {
    "use server"

    const email = formData.get("email") as string
    const password = formData.get("password") as string

    const emailDomainWhitelistPatternsString = await getEnvVarOrEdgeConfigValue(
      "EMAIL_DOMAIN_WHITELIST"
    )
    const emailDomainWhitelist = emailDomainWhitelistPatternsString?.trim()
      ? emailDomainWhitelistPatternsString?.split(",")
      : []
    const emailWhitelistPatternsString =
      await getEnvVarOrEdgeConfigValue("EMAIL_WHITELIST")
    const emailWhitelist = emailWhitelistPatternsString?.trim()
      ? emailWhitelistPatternsString?.split(",")
      : []

    // If there are whitelist patterns, check if the email is allowed to sign up
    if (emailDomainWhitelist.length > 0 || emailWhitelist.length > 0) {
      const domainMatch = emailDomainWhitelist?.includes(email.split("@")[1])
      const emailMatch = emailWhitelist?.includes(email)
      if (!domainMatch && !emailMatch) {
        return redirect(
          `/login?message=Email ${email} is not allowed to sign up.`
        )
      }
    }

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // USE IF YOU WANT TO SEND EMAIL VERIFICATION, ALSO CHANGE TOML FILE
        // emailRedirectTo: `${origin}/auth/callback`
      }
    })

    if (error) {
      console.error(error)
      return redirect(`/login?message=${error.message}`)
    }

    return redirect(
      "/login?message=Account created successfully! You can now sign in with your email and password.&type=success"
    )

    // USE IF YOU WANT TO SEND EMAIL VERIFICATION, ALSO CHANGE TOML FILE
    // return redirect("/login?message=Check email to continue sign in process")
  }

  const handleResetPassword = async (formData: FormData) => {
    "use server"

    const origin = headers().get("origin")
    const email = formData.get("email") as string
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/login/password`
    })

    if (error) {
      return redirect(`/login?message=${error.message}`)
    }

    return redirect("/login?message=Check email to reset password")
  }

  const signInWithGoogle = async () => {
    "use server"

    const headersList = headers()
    const host = headersList.get("host")
    const protocol = headersList.get("x-forwarded-proto") || "https"
    const origin = `${protocol}://${host}`

    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`
      }
    })

    if (error) {
      return redirect(`/login?message=${error.message}`)
    }

    return redirect(data.url)
  }

  return (
    <div className="flex h-screen w-full">
      {/* Left side - Hero section (hidden on mobile) */}
      <div className="relative hidden overflow-hidden bg-black lg:flex lg:w-1/2">
        {/* Subtle galaxy-like animated background */}
        <div className="absolute inset-0">
          {/* Base gradient with deep space colors */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/30 via-black to-purple-950/20"></div>

          {/* Animated stars/particles effect */}
          <div className="absolute inset-0 opacity-40">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  radial-gradient(1px 1px at 20% 30%, white, transparent),
                  radial-gradient(1px 1px at 60% 70%, white, transparent),
                  radial-gradient(1px 1px at 50% 50%, white, transparent),
                  radial-gradient(1px 1px at 80% 10%, white, transparent),
                  radial-gradient(1px 1px at 90% 60%, white, transparent),
                  radial-gradient(2px 2px at 33% 50%, #a78bfa, transparent),
                  radial-gradient(2px 2px at 79% 53%, #818cf8, transparent),
                  radial-gradient(1px 1px at 17% 70%, white, transparent),
                  radial-gradient(1px 1px at 44% 23%, white, transparent)
                `,
                backgroundSize:
                  "200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%",
                backgroundPosition: "0% 0%",
                animation: "galaxyMove 60s ease-in-out infinite"
              }}
            ></div>
          </div>

          {/* Nebula-like glow effects */}
          <div className="absolute left-1/4 top-1/4 size-[400px] rounded-full bg-indigo-500/10 blur-[100px]"></div>
          <div className="absolute bottom-1/4 right-1/4 size-[350px] rounded-full bg-purple-500/10 blur-[120px]"></div>
          <div className="absolute left-1/2 top-1/2 size-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/5 blur-[150px]"></div>
        </div>

        {/* Add keyframes animation inline */}
        <style jsx>{`
          @keyframes galaxyMove {
            0%,
            100% {
              background-position:
                0% 0%,
                10% 20%,
                30% 40%,
                50% 60%,
                70% 80%,
                15% 25%,
                45% 55%,
                65% 75%,
                85% 95%;
            }
            50% {
              background-position:
                100% 100%,
                90% 80%,
                70% 60%,
                50% 40%,
                30% 20%,
                85% 75%,
                55% 45%,
                35% 25%,
                15% 5%;
            }
          }
        `}</style>

        <div className="relative z-10 flex size-full flex-col items-center justify-center px-16 text-center">
          <div className="mb-12 flex justify-center">
            <Brand theme="light" />
          </div>

          <h1 className="bg-gradient-to-b from-white via-zinc-200 to-zinc-500 bg-clip-text text-6xl font-light leading-tight tracking-tight text-transparent">
            Every project
            <br />
            starts at the top
          </h1>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex w-full items-center justify-center px-8 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold">
              <TypewriterText text="Welcome to Rooftops AI." />
            </h2>
            <p className="text-muted-foreground mt-2">
              Sign in to your account to continue
            </p>
          </div>

          {/* Message banner at the top */}
          {searchParams?.message && (
            <div
              className={`mb-6 rounded-lg p-4 text-sm font-medium shadow-sm ${
                searchParams.type === "success"
                  ? "border-2 border-green-200 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-200"
                  : "border-2 border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200"
              }`}
            >
              {searchParams.message}
            </div>
          )}

          {/* Google Sign-in - Separate form to avoid validation conflicts */}
          <form action={signInWithGoogle} className="mb-6">
            <SubmitButton className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 font-medium text-white transition-all hover:border-zinc-600 hover:bg-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:border-zinc-500 dark:hover:bg-zinc-700">
              <svg className="size-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </SubmitButton>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-700 dark:border-zinc-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-background text-muted-foreground px-3">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email/Password Sign-in Form */}
          <form
            className="animate-in text-foreground flex w-full flex-col gap-5"
            action={signIn}
          >
            <div className="space-y-2">
              <Label className="text-sm font-medium" htmlFor="email">
                Email
              </Label>
              <Input
                className="rounded-lg border-zinc-700 bg-zinc-900/50 px-4 py-3 text-white transition-colors placeholder:text-zinc-500 focus:border-zinc-500 focus:bg-zinc-900 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:bg-zinc-800"
                name="email"
                placeholder="you@example.com"
                required
                type="email"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium" htmlFor="password">
                Password
              </Label>
              <Input
                className="rounded-lg border-zinc-700 bg-zinc-900/50 px-4 py-3 text-white transition-colors placeholder:text-zinc-500 focus:border-zinc-500 focus:bg-zinc-900 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:bg-zinc-800"
                type="password"
                name="password"
                placeholder="••••••••"
                required
              />
            </div>

            <SubmitButton className="mt-2 rounded-lg bg-white px-4 py-3 font-semibold text-black transition-all hover:bg-zinc-100">
              Sign in
            </SubmitButton>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-700 dark:border-zinc-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-background text-muted-foreground px-3">
                  Don&apos;t have an account?
                </span>
              </div>
            </div>

            <SubmitButton
              formAction={signUp}
              className="w-full rounded-lg border border-zinc-700 bg-transparent px-4 py-3 font-medium transition-all hover:border-zinc-600 hover:bg-zinc-900/50 dark:border-zinc-600 dark:hover:border-zinc-500 dark:hover:bg-zinc-800/50"
            >
              Create account
            </SubmitButton>

            <div className="text-muted-foreground mt-1 flex justify-center text-sm">
              <button
                formAction={handleResetPassword}
                className="hover:text-foreground transition-colors"
              >
                Forgot your password?
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
