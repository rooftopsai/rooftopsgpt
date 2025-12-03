"use client"

import { RooftopsSVG } from "@/components/icons/rooftops-svg"

export const AnimatedRooftopsLoader = () => {
  return (
    <div className="relative flex flex-col items-center">
      <style jsx global>{`
        @keyframes drawPath {
          0% {
            stroke-dashoffset: 2000;
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }

        @keyframes fadeInScale {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }

        @keyframes fadeInText {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .rooftops-loader {
          animation:
            fadeInScale 0.8s ease-out,
            pulse 2s ease-in-out infinite 1s;
        }

        .rooftops-loader path {
          stroke-dasharray: 2000;
          stroke-dashoffset: 2000;
          animation: drawPath 2.5s ease-out forwards;
        }

        .rooftops-loader path:nth-child(1) {
          animation-delay: 0s;
        }

        .rooftops-loader path:nth-child(2) {
          animation-delay: 0.3s;
        }

        .rooftops-loader path:nth-child(3) {
          animation-delay: 0.6s;
        }

        .rooftops-loader path:nth-child(4) {
          animation-delay: 0.9s;
        }

        .rooftops-tagline {
          animation: fadeInText 0.8s ease-out 1.2s both;
        }
      `}</style>
      <RooftopsSVG className="rooftops-loader size-24" />
      <div className="rooftops-tagline mt-6 font-serif text-3xl text-black dark:text-white">
        AI for roofers
      </div>
    </div>
  )
}
