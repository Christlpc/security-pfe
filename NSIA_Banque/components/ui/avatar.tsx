import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface AvatarProps {
  name: string;
  email?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showStatus?: boolean;
  isActive?: boolean;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

const statusSizeClasses = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
};

// Génère une couleur basée sur le nom pour la cohérence
function getColorFromName(name: string): string {
  const colors = [
    "bg-gradient-to-br from-blue-500 to-blue-600",
    "bg-gradient-to-br from-green-500 to-green-600",
    "bg-gradient-to-br from-purple-500 to-purple-600",
    "bg-gradient-to-br from-pink-500 to-pink-600",
    "bg-gradient-to-br from-indigo-500 to-indigo-600",
    "bg-gradient-to-br from-yellow-500 to-yellow-600",
    "bg-gradient-to-br from-red-500 to-red-600",
    "bg-gradient-to-br from-teal-500 to-teal-600",
    "bg-gradient-to-br from-orange-500 to-orange-600",
    "bg-gradient-to-br from-cyan-500 to-cyan-600",
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

// Génère les initiales à partir du nom complet
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function Avatar({ 
  name, 
  email, 
  size = "md", 
  className,
  showStatus = false,
  isActive = true,
}: AvatarProps) {
  const initials = getInitials(name);
  const bgColor = getColorFromName(name || email || "");

  return (
    <div className="relative inline-block">
      <div
        className={cn(
          "rounded-full flex items-center justify-center font-semibold text-white shadow-md",
          sizeClasses[size],
          bgColor,
          className
        )}
        title={name}
      >
        {initials}
      </div>
      {showStatus && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full border-2 border-white",
            statusSizeClasses[size],
            isActive ? "bg-green-500" : "bg-gray-400"
          )}
        />
      )}
    </div>
  );
}

