// components/ui/spinner.tsx
import { cn } from "@/lib/utils";
import React from "react";

interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "circular" | "dots";
  color?: string;
}

export function Spinner({ 
  className, 
  size = "md", 
  variant = "circular",
  color = "#02CD92" 
}: SpinnerProps) {
  const sizeClasses = {
    sm: variant === "circular" ? "h-5 w-5" : "h-4",
    md: variant === "circular" ? "h-7 w-7" : "h-5",
    lg: variant === "circular" ? "h-9 w-9" : "h-6"
  };
  
  const dotSizes = {
    sm: "w-1 h-1",
    md: "w-1.5 h-1.5",
    lg: "w-2 h-2"
  };
  
  if (variant === "dots") {
    return (
      <div className={cn("flex items-center space-x-1", sizeClasses[size], className)}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{ backgroundColor: color }}
            className={cn(
              dotSizes[size],
              "rounded-full opacity-60",
              "animate-pulse"
            )}
            css={`
              animation: dotsAnimation 1.4s infinite ease-in-out;
              animation-delay: ${i * 0.16}s;
              @keyframes dotsAnimation {
                0%, 80%, 100% { 
                  opacity: 0.2;
                  transform: scale(0.8);
                }
                40% { 
                  opacity: 1;
                  transform: scale(1);
                }
              }
            `}
          />
        ))}
      </div>
    );
  }
  
  // Circular spinner - Apple-style segmented circle
  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      <svg
        className="animate-spin"
        viewBox="0 0 50 50"
        style={{ 
          animation: "spinnerRotate 5s linear infinite"
        }}
      >
        <defs>
          <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.1" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>
        {[...Array(12)].map((_, i) => {
          const opacity = 0.25 + (11 - i) * (0.75 / 11);
          const rotateAngle = i * 30;
          return (
            <rect
              key={i}
              x="23.5"
              y="7"
              width="3"
              height="10"
              rx="1.5"
              fill={color}
              style={{
                opacity,
                transform: `rotate(${rotateAngle}deg)`,
                transformOrigin: "center center",
              }}
            />
          );
        })}
      </svg>
      <style jsx>{`
        @keyframes spinnerRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes dotsAnimation {
          0%, 80%, 100% { 
            opacity: 0.2;
            transform: scale(0.8);
          }
          40% { 
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}