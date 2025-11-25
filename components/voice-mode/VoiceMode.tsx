"use client"

import { useState, useEffect, useCallback } from "react"
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  useConnectionState,
  useLocalParticipant,
} from "@livekit/components-react"
import { ConnectionState } from "livekit-client"
import { IconX } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import "@livekit/components-styles"

interface VoiceModeProps {
  onClose?: () => void
}

// Animated particle orb component
function AnimatedOrb({ state }: { state: string }) {
  const getParticleColor = () => {
    switch (state) {
      case "listening":
        return "bg-cyan-400"
      case "thinking":
        return "bg-purple-400"
      case "speaking":
        return "bg-emerald-400"
      default:
        return "bg-blue-400"
    }
  }

  const getParticleAnimation = () => {
    switch (state) {
      case "listening":
        return "animate-pulse-slow"
      case "thinking":
        return "animate-spin-slow"
      case "speaking":
        return "animate-wave"
      default:
        return "animate-float"
    }
  }

  // Generate particle positions in a 3D sphere formation
  const particles = Array.from({ length: 350 }).map((_, i) => {
    // Use spherical coordinates for proper 3D distribution
    const theta = Math.random() * Math.PI * 2 // Horizontal angle
    const phi = Math.acos(2 * Math.random() - 1) // Vertical angle for uniform distribution
    const radius = 120 + Math.random() * 15 // Tighter radius range for cleaner sphere

    // Convert spherical to 3D cartesian coordinates
    const x = radius * Math.sin(phi) * Math.cos(theta)
    const y = radius * Math.sin(phi) * Math.sin(theta)
    const z = radius * Math.cos(phi)

    // Project 3D to 2D (perspective projection)
    const perspective = 600
    const scale = perspective / (perspective + z)
    const x2d = x * scale
    const y2d = y * scale

    // Consistent particle sizes for cleaner look
    const baseSize = 4 + Math.random() * 4
    const size = baseSize * scale

    // Opacity based on depth
    const opacity = 0.4 + (scale * 0.6)

    const delay = Math.random() * 2
    const duration = 2 + Math.random() * 3

    return { x: x2d, y: y2d, z, size, opacity, delay, duration, id: i }
  })

  // Generate background scattered particles
  const backgroundParticles = Array.from({ length: 50 }).map((_, i) => {
    const x = (Math.random() - 0.5) * 800
    const y = (Math.random() - 0.5) * 800
    const size = 2 + Math.random() * 4
    const delay = Math.random() * 5

    return { x, y, size, delay, id: i }
  })

  return (
    <div className="relative flex size-full items-center justify-center">
      {/* Background scattered particles */}
      {backgroundParticles.map((particle) => (
        <div
          key={`bg-${particle.id}`}
          className={`absolute rounded-full ${getParticleColor()} opacity-20`}
          style={{
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            left: `calc(50% + ${particle.x}px)`,
            top: `calc(50% + ${particle.y}px)`,
            animation: `float 4s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}

      {/* Main particle orb */}
      <div className={`relative ${getParticleAnimation()}`}>
        {particles
          .sort((a, b) => a.z - b.z) // Sort by z-depth (back to front)
          .map((particle) => (
            <div
              key={particle.id}
              className={`absolute rounded-full ${getParticleColor()} transition-all duration-500`}
              style={{
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                left: `${particle.x}px`,
                top: `${particle.y}px`,
                opacity: particle.opacity,
                animation: `float ${particle.duration}s ease-in-out infinite`,
                animationDelay: `${particle.delay}s`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
      </div>
    </div>
  )
}

function VoiceAssistantControls({ onClose }: VoiceModeProps) {
  const { state, audioTrack } = useVoiceAssistant()
  const connectionState = useConnectionState()
  const { localParticipant } = useLocalParticipant()
  const [isMuted, setIsMuted] = useState(false)

  const toggleMute = useCallback(async () => {
    if (localParticipant) {
      const micEnabled = localParticipant.isMicrophoneEnabled
      await localParticipant.setMicrophoneEnabled(!micEnabled)
      setIsMuted(micEnabled)
    }
  }, [localParticipant])

  // Enable microphone automatically when connected
  useEffect(() => {
    if (connectionState === ConnectionState.Connected && localParticipant) {
      localParticipant.setMicrophoneEnabled(true).catch(err => {
        console.error("Failed to enable microphone:", err)
      })
    }
  }, [connectionState, localParticipant])

  const getStatusText = () => {
    if (connectionState !== ConnectionState.Connected) {
      return { title: "Connecting...", subtitle: "Please wait" }
    }

    switch (state) {
      case "listening":
        return { title: "Listening", subtitle: "I'm listening to you..." }
      case "thinking":
        return { title: "Thinking", subtitle: "Processing your request..." }
      case "speaking":
        return { title: "Speaking", subtitle: "Responding to you..." }
      case "idle":
        return { title: "Ready", subtitle: "Start speaking to begin" }
      default:
        return { title: "Initializing", subtitle: "Setting up voice mode..." }
    }
  }

  const statusText = getStatusText()

  return (
    <div className="relative flex size-full flex-col items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black">
      {/* Close button */}
      <Button
        onClick={onClose}
        variant="ghost"
        size="icon"
        className="absolute right-6 top-6 z-50 size-12 rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <IconX size={24} />
      </Button>

      {/* Main content - Just the orb */}
      <div className="flex size-full flex-col items-center justify-center">
        <AnimatedOrb state={state || "idle"} />
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-12 flex items-center gap-8">
        <Button
          onClick={toggleMute}
          variant="ghost"
          className={`size-16 rounded-full${
            isMuted
              ? "bg-red-500 hover:bg-red-600"
              : "bg-white/10 hover:bg-white/20"
          } text-white transition-all`}
          disabled={connectionState !== ConnectionState.Connected}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="size-6"
          >
            {isMuted ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 19L5 5m14 0L5 19M12 19v-7m0 0a3 3 0 003-3V7a3 3 0 10-6 0v2a3 3 0 003 3z"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
              />
            )}
          </svg>
        </Button>
      </div>
    </div>
  )
}

export function VoiceMode({ onClose }: VoiceModeProps) {
  const [token, setToken] = useState<string>("")
  const [connecting, setConnecting] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function getToken() {
      try {
        const response = await fetch("/api/livekit/token")
        if (!response.ok) {
          throw new Error("Failed to get LiveKit token")
        }
        const data = await response.json()
        setToken(data.token)
        setConnecting(false)
      } catch (err: any) {
        console.error("Error getting token:", err)
        setError(err.message || "Failed to connect to voice assistant")
        setConnecting(false)
      }
    }

    getToken()
  }, [])

  if (connecting) {
    return (
      <div className="flex size-full items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto mb-4 size-8 animate-spin rounded-full border-4 border-t-transparent"></div>
          <p className="text-muted-foreground text-sm">
            Connecting to voice assistant...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex size-full items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mb-4 text-red-500">
            <IconX size={48} className="mx-auto" />
          </div>
          <p className="text-muted-foreground mb-4 text-sm">{error}</p>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    )
  }

  if (!token) {
    return null
  }

  return (
    <div className="size-full">
      <LiveKitRoom
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        connect={true}
        audio={true}
        video={false}
        className="size-full"
      >
        <VoiceAssistantControls onClose={onClose} />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  )
}
