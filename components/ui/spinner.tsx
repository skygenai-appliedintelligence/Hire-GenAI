import React from "react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

export function Spinner({ size = "md", className = "", text }: SpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`animate-spin rounded-full border-t-2 border-b-2 border-emerald-500 ${sizeClasses[size]}`}
      ></div>
      {text && <p className="mt-2 text-sm text-gray-500">{text}</p>}
    </div>
  );
}
