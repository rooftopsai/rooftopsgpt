"use client"

import { AnimatedRooftopsLoader } from "@/components/ui/animated-rooftops-loader"
import { useEffect, useState } from "react"

export default function Loading() {
  const [isVisible, setIsVisible] = useState(true)
  const [mountTime] = useState(Date.now())

  useEffect(() => {
    const minimumDisplayTime = 2000 // 2 seconds
    const elapsed = Date.now() - mountTime
    const remainingTime = Math.max(0, minimumDisplayTime - elapsed)

    const timer = setTimeout(() => {
      setIsVisible(false)
    }, remainingTime)

    return () => clearTimeout(timer)
  }, [mountTime])

  return (
    <div
      className="flex size-full flex-col items-center justify-center transition-opacity duration-500"
      style={{ opacity: isVisible ? 1 : 0 }}
    >
      <AnimatedRooftopsLoader />
    </div>
  )
}
