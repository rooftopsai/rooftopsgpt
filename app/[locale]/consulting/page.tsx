"use client"

import { useRouter } from "next/navigation"
import Image from "next/image"
import { 
  IconCheck, 
  IconCalendar, 
  IconVideo, 
  IconBrain,
  IconTrendingUp,
  IconUsers,
  IconBuildingStore,
  IconArrowRight,
  IconShieldCheck,
  IconClock,
  IconMessageCircle
} from "@tabler/icons-react"

export default function ConsultingPage() {
  const router = useRouter()

  const handleCheckout = () => {
    router.push("/consulting/checkout")
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Image
              src="/rooftops-logo-gr-black.png"
              alt="AI Consulting for Roofing"
              width={180}
              height={40}
              className="h-8 w-auto"
            />
          </div>
          <div className="text-sm text-gray-500">
            A Rooftops AI Service
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-green-500/20 px-4 py-2 ring-1 ring-cyan-500/30">
            <IconBrain className="size-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-300">White-Glove AI Consulting</span>
          </div>
          
          <h1 className="mb-6 text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
            Transform Your Roofing Business with{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent">
              AI in 5 Weeks
            </span>
          </h1>
          
          <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-300">
            Exclusive 1-on-1 consulting for roofing company leaders who want to dominate their market 
            using AI. Virtual sessions designed specifically for the roofing industry.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={handleCheckout}
              className="group flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-green-500 px-8 py-4 font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:shadow-cyan-500/25"
            >
              Reserve Your Spot — $5,000
              <IconArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
            </button>
            <p className="text-sm text-gray-400">
              Only 4 spots available per month
            </p>
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <IconShieldCheck className="size-4 text-green-400" />
              <span>100% Satisfaction Guarantee</span>
            </div>
            <div className="flex items-center gap-2">
              <IconVideo className="size-4 text-cyan-400" />
              <span>Virtual via Zoom</span>
            </div>
            <div className="flex items-center gap-2">
              <IconClock className="size-4 text-cyan-400" />
              <span>5 One-Hour Sessions</span>
            </div>
          </div>
        </div>
      </section>

      {/* Who This Is For */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900">Built Exclusively for Roofing Leaders</h2>
            <p className="mt-3 text-gray-600">This isn't generic business consulting. It's AI strategy tailored to roofing.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-cyan-100">
                <IconBuildingStore className="size-6 text-cyan-600" />
              </div>
              <h3 className="mb-2 font-bold text-gray-900">Roofing Company Owners</h3>
              <p className="text-sm text-gray-600">
                You're running a $1M-$10M roofing company and know AI is the future, 
                but don't know where to start.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-green-100">
                <IconTrendingUp className="size-6 text-green-600" />
              </div>
              <h3 className="mb-2 font-bold text-gray-900">Growth-Focused Leaders</h3>
              <p className="text-sm text-gray-600">
                You want to 2x or 3x your business in the next 12-18 months and 
                understand AI is the lever to pull.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-purple-100">
                <IconUsers className="size-6 text-purple-600" />
              </div>
              <h3 className="mb-2 font-bold text-gray-900">Forward-Thinking Teams</h3>
              <p className="text-sm text-gray-600">
                You're tired of watching competitors adopt AI while you're stuck 
                with outdated processes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Program */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900">The 5-Week Transformation</h2>
            <p className="mt-3 text-gray-600">Each session builds on the last. By week 5, AI is running your business.</p>
          </div>

          <div className="space-y-4">
            {[
              {
                week: "Week 1",
                title: "AI Audit & Strategy",
                desc: "We analyze your entire operation and identify the highest-impact AI opportunities. You'll leave with a 90-day AI roadmap specific to your business.",
                deliverable: "Custom AI Implementation Roadmap"
              },
              {
                week: "Week 2",
                title: "Multi-Agent Property Analysis",
                desc: "Deep dive into how AI agents analyze properties from multiple angles simultaneously. Set up instant roof measurements, damage detection, and material calculations.",
                deliverable: "Working AI Property Analysis System"
              },
              {
                week: "Week 3",
                title: "AI Sales & Estimating",
                desc: "Build AI-powered estimating workflows that generate professional proposals in minutes. Train AI on your pricing, materials, and labor rates.",
                deliverable: "AI Estimating & Proposal System"
              },
              {
                week: "Week 4",
                title: "AI Marketing & Lead Gen",
                desc: "Create AI employees that handle content, social media, email follow-ups, and lead nurturing. Never write another sales email from scratch.",
                deliverable: "AI Marketing Automation Setup"
              },
              {
                week: "Week 5",
                title: "Implementation & Scale",
                desc: "Deploy everything into your daily operations. Train your team. Set up monitoring. Build your AI advantage that competitors can't copy.",
                deliverable: "Fully Operational AI-Enhanced Business"
              }
            ].map((week, idx) => (
              <div key={idx} className="flex gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex shrink-0 flex-col items-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-green-500 text-white font-bold">
                    {idx + 1}
                  </div>
                  {idx < 4 && <div className="mt-2 h-full w-0.5 bg-gradient-to-b from-cyan-500/50 to-transparent" />}
                </div>
                <div className="flex-1">
                  <div className="mb-1 text-sm font-medium text-cyan-600">{week.week}</div>
                  <h3 className="mb-2 text-xl font-bold text-gray-900">{week.title}</h3>
                  <p className="mb-3 text-gray-600">{week.desc}</p>
                  <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-sm text-green-700">
                    <IconCheck className="size-4" />
                    {week.deliverable}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="mb-6 text-3xl font-bold text-gray-900">Everything Included</h2>
              
              <ul className="space-y-4">
                {[
                  "5 one-hour private consulting sessions via Zoom",
                  "Direct access to Steele via email between sessions",
                  "Custom AI setup for your specific business",
                  "Roofing-specific AI prompt libraries",
                  "Property analysis workflow automation",
                  "Sales proposal templates & AI training",
                  "Marketing content AI training",
                  "6 months of Rooftops AI Premium included ($174 value)",
                  "Lifetime access to consulting recordings",
                  "Private AI consulting community access"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="flex size-6 items-center justify-center rounded-full bg-green-100 shrink-0 mt-0.5">
                      <IconCheck className="size-4 text-green-600" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-8 text-white">
              <h3 className="mb-6 text-2xl font-bold">Your Investment</h3>
              
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">$5,000</span>
                  <span className="text-gray-400">one-time</span>
                </div>
              </div>

              <div className="mb-6 space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <IconCalendar className="size-4" />
                  <span>5 weekly 1-hour sessions</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <IconVideo className="size-4" />
                  <span>Virtual via Zoom</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <IconMessageCircle className="size-4" />
                  <span>Email support between sessions</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-green-500 py-4 font-semibold text-white shadow-lg transition-all hover:shadow-xl"
              >
                Reserve Your Spot Now
              </button>

              <p className="mt-4 text-center text-xs text-gray-400">
                Secure payment via Stripe · Satisfaction guaranteed
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Lead Capture - Not Ready to Buy? */}
      <section className="bg-gradient-to-r from-amber-50 to-orange-50 py-16">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="mb-3 text-2xl font-bold text-gray-900">
            Not Ready to Book? Get the Free Guide
          </h2>
          <p className="mb-6 text-gray-600">
            Download "The Roofing AI Playbook" — 27 pages on how AI is transforming roofing businesses. 
            No email required for the first chapter.
          </p>
          
          <form 
            onSubmit={(e) => {
              e.preventDefault()
              // This would typically call an API to capture the lead
              alert("Thanks! Check your email for the guide.")
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 rounded-lg border border-gray-200 px-4 py-3 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              required
            />
            <button
              type="submit"
              className="rounded-lg bg-gradient-to-r from-cyan-500 to-green-500 px-6 py-3 font-semibold text-white shadow-md transition-all hover:shadow-lg"
            >
              Send Me the Playbook
            </button>
          </form>
          
          <p className="mt-3 text-xs text-gray-500">
            We respect your privacy. Unsubscribe anytime.
          </p>
        </div>
      </section>

      {/* Guarantee */}
      <section className="bg-gradient-to-r from-cyan-50 to-green-50 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <div className="mb-6 inline-flex size-16 items-center justify-center rounded-full bg-white shadow-md">
            <IconShieldCheck className="size-8 text-green-600" />
          </div>
          <h2 className="mb-4 text-3xl font-bold text-gray-900">The "AI Working or Your Money Back" Guarantee</h2>
          <p className="text-lg text-gray-600">
            If after week 2 you don't see a clear path to AI transforming your business, 
            I'll refund 100% of your investment. No questions asked. I'm only interested 
            in working with roofing companies that get real results.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-900">Ready to AI-Enable Your Roofing Business?</h2>
          <p className="mb-8 text-gray-600">
            Only 4 spots available per month. Next cohort starts soon.
          </p>

          <button
            onClick={handleCheckout}
            className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-green-500 px-10 py-5 text-lg font-semibold text-white shadow-lg transition-all hover:shadow-xl"
          >
            Reserve Your Spot — $5,000
            <IconArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
          </button>

          <p className="mt-6 text-sm text-gray-500">
            Questions? Email sb@rooftops.ai
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="mx-auto max-w-4xl px-4 text-center text-sm text-gray-500">
          <p>© 2024 Rooftops AI Consulting. All rights reserved.</p>
          <p className="mt-2">
            This is a separate consulting service from Rooftops AI subscription software.
          </p>
        </div>
      </footer>
    </div>
  )
}