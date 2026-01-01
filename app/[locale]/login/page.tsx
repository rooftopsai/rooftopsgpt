// @ts-nocheck
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
import Image from "next/image"
import { IconCheck } from "@tabler/icons-react"

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
      "/login?message=Account created successfully! Check your email for a sign in link.&type=success"
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
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left side - Hero section with background */}
      <div
        className="relative hidden flex-col justify-between p-12 text-white lg:flex lg:w-1/2"
        style={{
          backgroundImage: "url(/login-background.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: "#0f172a"
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-blue-900/80"></div>

        <div className="relative z-10 flex h-full flex-col justify-between">
          {/* Logo */}
          <div>
            <Image
              src="/rooftops-logo-gr-master.png"
              alt="Rooftops AI"
              width={180}
              height={40}
              className="mb-16"
            />
          </div>

          {/* Main content */}
          <div className="flex flex-1 flex-col justify-center">
            <h1 className="mb-6 text-5xl font-bold leading-tight">
              The future of
              <br />
              <span className="text-cyan-400">roof intelligence</span>
            </h1>

            <p className="mb-12 max-w-lg text-lg text-gray-300">
              Instantly analyze roof conditions, generate professional reports,
              and close deals faster with our AI-powered platform.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex size-6 items-center justify-center rounded-full bg-cyan-400/20">
                  <IconCheck size={16} className="text-cyan-400" />
                </div>
                <span className="text-gray-200">
                  Custom AI Chat for your business
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex size-6 items-center justify-center rounded-full bg-cyan-400/20">
                  <IconCheck size={16} className="text-cyan-400" />
                </div>
                <span className="text-gray-200">Instant Roof Measurements</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex size-6 items-center justify-center rounded-full bg-cyan-400/20">
                  <IconCheck size={16} className="text-cyan-400" />
                </div>
                <span className="text-gray-200">AI Agent Library</span>
              </div>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <Image
                src="/man-stock-1.jpg"
                alt="User"
                width={40}
                height={40}
                className="rounded-full border-2 border-slate-900"
              />
              <Image
                src="/man-stock-2.jpg"
                alt="User"
                width={40}
                height={40}
                className="rounded-full border-2 border-slate-900"
              />
              <div className="flex size-10 items-center justify-center rounded-full border-2 border-slate-900 bg-slate-700 text-sm font-medium">
                +2k
              </div>
            </div>
            <p className="text-sm text-gray-300">
              Trusted by{" "}
              <span className="font-semibold text-white">
                hundreds of roofing pros
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex w-full items-center justify-center bg-white px-8 py-12 lg:w-1/2 dark:bg-slate-950">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex justify-center lg:hidden">
            <Image
              src="/rooftops-logo-gr-master.png"
              alt="Rooftops AI"
              width={150}
              height={35}
            />
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Enter your credentials to access your dashboard
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-8 flex border-b border-gray-200 dark:border-gray-700">
            <button className="border-b-2 border-gray-900 px-4 py-3 text-sm font-medium text-gray-900 dark:border-white dark:text-white">
              Sign In
            </button>
            <button className="px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">
              Create Account
            </button>
          </div>

          {/* Message banner */}
          {searchParams?.message && (
            <div
              className={`mb-6 rounded-lg p-4 text-sm font-medium ${
                searchParams.type === "success"
                  ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-200"
                  : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200"
              }`}
            >
              {searchParams.message}
            </div>
          )}

          {/* Google Sign-in */}
          <form action={signInWithGoogle} className="mb-6">
            <SubmitButton className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-600 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800">
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
              <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 uppercase tracking-wider text-gray-500 dark:bg-slate-950 dark:text-gray-400">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email/Password Sign-in Form */}
          <form className="flex w-full flex-col gap-5" action={signIn}>
            <div className="space-y-2">
              <Label
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
                htmlFor="email"
              >
                Email
              </Label>
              <Input
                className="rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-gray-900 focus:ring-gray-900 dark:border-gray-600 dark:bg-slate-900 dark:text-white dark:focus:border-white dark:focus:ring-white"
                name="email"
                placeholder="name@company.com"
                required
                type="email"
              />
            </div>

            <div className="space-y-2">
              <Label
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
                htmlFor="password"
              >
                Password
              </Label>
              <Input
                className="rounded-lg border-gray-300 bg-white px-4 py-3 text-gray-900 focus:border-gray-900 focus:ring-gray-900 dark:border-gray-600 dark:bg-slate-900 dark:text-white dark:focus:border-white dark:focus:ring-white"
                type="password"
                name="password"
                placeholder="••••••••"
                required
              />
            </div>

            <SubmitButton className="mt-2 rounded-lg bg-gray-900 px-4 py-3 font-semibold text-white transition-all hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100">
              Sign In
            </SubmitButton>

            <div className="mt-4 text-center text-xs text-gray-600 dark:text-gray-400">
              By clicking continue, you agree to our{" "}
              <a
                href="#"
                className="underline hover:text-gray-900 dark:hover:text-white"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="#"
                className="underline hover:text-gray-900 dark:hover:text-white"
              >
                Privacy Policy
              </a>
              .
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
