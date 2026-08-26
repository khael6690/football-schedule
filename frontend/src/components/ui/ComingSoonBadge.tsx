import React from "react";
import { cn } from "@/lib/utils";
import { Clock, AlertCircle, Sparkles } from "lucide-react";

interface ComingSoonBadgeProps {
  text?: string;
  variant?: "warning" | "info" | "purple" | "subtle";
  className?: string;
  size?: "sm" | "md";
}

export function ComingSoonBadge({
  text = "Coming Soon",
  variant = "warning",
  className,
  size = "sm",
}: ComingSoonBadgeProps) {
  const variantStyles = {
    warning: "bg-amber-500/10 border-amber-500/30 text-amber-400 dark:text-amber-300",
    info: "bg-blue-500/10 border-blue-500/30 text-blue-400 dark:text-blue-300",
    purple: "bg-purple-500/10 border-purple-500/30 text-purple-400 dark:text-purple-300",
    subtle: "bg-zinc-800/80 border-zinc-700 text-zinc-400",
  };

  const sizeStyles = {
    sm: "text-[10px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border uppercase tracking-wider select-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      title="This section is currently using dummy/mock data and is pending Backend API integration"
    >
      <Clock className={size === "sm" ? "w-2.5 h-2.5 shrink-0" : "w-3 h-3 shrink-0"} />
      <span>{text}</span>
    </span>
  );
}

interface ComingSoonSectionProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function ComingSoonSection({
  title,
  description = "This feature is currently under active development and waiting for backend API support.",
  icon,
  className,
}: ComingSoonSectionProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-zinc-900/60 border border-dashed border-zinc-800 text-zinc-400 space-y-4",
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-amber-400">
        {icon || <Sparkles className="w-6 h-6" />}
      </div>
      <div className="space-y-1 max-w-md">
        <div className="flex items-center justify-center gap-2">
          <h3 className="font-semibold text-lg text-zinc-200">{title}</h3>
          <ComingSoonBadge text="Coming Soon" variant="warning" />
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
