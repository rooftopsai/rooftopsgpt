// Rate limiting utilities for API protection
// Uses Upstash Redis for distributed rate limiting

import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextResponse } from "next/server"

// Create a rate limiter that allows 60 requests per minute for standard endpoints
const standardLimiter = process.env.UPSTASH_REDIS_REST_URL
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      analytics: true,
      prefix: "ratelimit:standard"
    })
  : null

// Create a stricter rate limiter for expensive operations (10 per minute)
const expensiveLimiter = process.env.UPSTASH_REDIS_REST_URL
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      analytics: true,
      prefix: "ratelimit:expensive"
    })
  : null

// Create an even stricter rate limiter for AI chat (30 per minute)
const chatLimiter = process.env.UPSTASH_REDIS_REST_URL
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(30, "1 m"),
      analytics: true,
      prefix: "ratelimit:chat"
    })
  : null

// Create rate limiter for auth attempts (5 per minute to prevent brute force)
const authLimiter = process.env.UPSTASH_REDIS_REST_URL
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      analytics: true,
      prefix: "ratelimit:auth"
    })
  : null

export type RateLimitType = "standard" | "expensive" | "chat" | "auth"

const limiters: Record<RateLimitType, Ratelimit | null> = {
  standard: standardLimiter,
  expensive: expensiveLimiter,
  chat: chatLimiter,
  auth: authLimiter
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

/**
 * Check rate limit for an identifier (usually user ID or IP)
 */
export async function checkRateLimit(
  identifier: string,
  type: RateLimitType = "standard"
): Promise<RateLimitResult> {
  const limiter = limiters[type]

  // If no limiter configured (Upstash not set up), allow all requests
  if (!limiter) {
    return {
      success: true,
      limit: Infinity,
      remaining: Infinity,
      reset: 0
    }
  }

  const result = await limiter.limit(identifier)
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset
  }
}

/**
 * Get the identifier for rate limiting from a request
 * Prefers user ID if authenticated, falls back to IP address
 */
export function getRateLimitIdentifier(
  request: Request,
  userId?: string
): string {
  if (userId) {
    return `user:${userId}`
  }

  // Get IP from various headers (Vercel, Cloudflare, etc.)
  const forwardedFor = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  const cfConnectingIp = request.headers.get("cf-connecting-ip")

  const ip =
    forwardedFor?.split(",")[0].trim() || realIp || cfConnectingIp || "unknown"

  return `ip:${ip}`
}

/**
 * Create a rate limit error response with proper headers
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: "Too many requests",
      message: "Rate limit exceeded. Please slow down.",
      retryAfter: Math.ceil((result.reset - Date.now()) / 1000)
    },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.reset),
        "Retry-After": String(Math.ceil((result.reset - Date.now()) / 1000))
      }
    }
  )
}

/**
 * Helper function to apply rate limiting to an API route
 * Returns null if rate limit passes, or a Response if it fails
 */
export async function applyRateLimit(
  request: Request,
  userId?: string,
  type: RateLimitType = "standard"
): Promise<NextResponse | null> {
  const identifier = getRateLimitIdentifier(request, userId)
  const result = await checkRateLimit(identifier, type)

  if (!result.success) {
    return rateLimitResponse(result)
  }

  return null
}
