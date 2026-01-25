"use client"

import {
  IconCloud,
  IconSun,
  IconCloudRain,
  IconSnowflake,
  IconWind,
  IconDroplet,
  IconTemperature
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface WeatherData {
  status: string
  location: string
  requested_location?: string
  current?: {
    temp_f: string
    condition: string
    humidity: string
    wind_mph: string
  }
  forecast?: Array<{
    date: string
    high_f: string
    low_f: string
    condition: string
    chance_of_rain: string
  }>
  roofing_advisory?: string
}

interface AgentWeatherCardProps {
  data: WeatherData
}

export function AgentWeatherCard({ data }: AgentWeatherCardProps) {
  if (data.status !== "success" || !data.current) {
    return null
  }

  const getWeatherIcon = (condition: string) => {
    const conditionLower = condition.toLowerCase()
    if (conditionLower.includes("rain") || conditionLower.includes("shower")) {
      return IconCloudRain
    }
    if (conditionLower.includes("snow") || conditionLower.includes("ice")) {
      return IconSnowflake
    }
    if (conditionLower.includes("cloud") || conditionLower.includes("overcast")) {
      return IconCloud
    }
    if (conditionLower.includes("wind")) {
      return IconWind
    }
    return IconSun
  }

  const getWeatherGradient = (condition: string) => {
    const conditionLower = condition.toLowerCase()
    if (conditionLower.includes("rain") || conditionLower.includes("shower")) {
      return "from-blue-600 to-gray-700"
    }
    if (conditionLower.includes("snow") || conditionLower.includes("ice")) {
      return "from-blue-400 to-blue-600"
    }
    if (conditionLower.includes("cloud") || conditionLower.includes("overcast")) {
      return "from-gray-500 to-gray-700"
    }
    return "from-yellow-500 to-orange-500"
  }

  const WeatherIcon = getWeatherIcon(data.current.condition)
  const gradient = getWeatherGradient(data.current.condition)

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-blue-500/20 backdrop-blur-md">
      {/* Header with current weather */}
      <div className={cn("bg-gradient-to-br p-4", gradient)}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white/80">{data.location}</p>
            <p className="text-4xl font-bold text-white">{data.current.temp_f}°F</p>
            <p className="text-lg font-light text-white/90">{data.current.condition}</p>
          </div>
          <WeatherIcon className="size-16 text-white/80" />
        </div>
        <div className="mt-3 flex gap-4 text-sm font-light text-white/80">
          <div className="flex items-center gap-1">
            <IconDroplet className="size-4" />
            <span>{data.current.humidity}</span>
          </div>
          <div className="flex items-center gap-1">
            <IconWind className="size-4" />
            <span>{data.current.wind_mph} mph</span>
          </div>
        </div>
      </div>

      {/* Forecast */}
      {data.forecast && data.forecast.length > 0 && (
        <div className="border-t border-blue-500/15 bg-gradient-to-br from-blue-500/5 to-purple-500/5 p-3">
          <div className="grid grid-cols-3 gap-2">
            {data.forecast.map((day, index) => {
              const DayIcon = getWeatherIcon(day.condition)
              const isRainy = parseInt(day.chance_of_rain) > 40
              return (
                <div
                  key={index}
                  className={cn(
                    "flex flex-col items-center rounded-xl border p-2 text-center backdrop-blur-sm",
                    isRainy
                      ? "border-blue-500/30 bg-gradient-to-br from-blue-500/15 to-blue-600/15"
                      : "border-blue-500/10 bg-gradient-to-br from-blue-500/5 to-purple-500/5"
                  )}
                >
                  <span className="text-xs font-light text-muted-foreground">
                    {new Date(day.date).toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                  <DayIcon className={cn(
                    "my-1 size-6",
                    isRainy ? "text-blue-400" : "text-muted-foreground"
                  )} />
                  <div className="text-sm">
                    <span className="font-medium text-foreground">{day.high_f}°</span>
                    <span className="font-light text-muted-foreground"> / {day.low_f}°</span>
                  </div>
                  {isRainy && (
                    <span className="text-xs font-light text-blue-400">{day.chance_of_rain}% rain</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Roofing Advisory */}
      {data.roofing_advisory && (
        <div className={cn(
          "border-t border-blue-500/15 px-4 py-2 text-sm font-light",
          data.roofing_advisory.includes("Rain") || data.roofing_advisory.includes("rain")
            ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-400"
            : "bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-400"
        )}>
          <span className="font-medium">Roofing Advisory:</span> {data.roofing_advisory}
        </div>
      )}
    </div>
  )
}
