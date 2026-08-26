import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circle" | "rect";
}

export function Skeleton({ className, variant = "rect", ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-zinc-200 dark:bg-zinc-800",
        variant === "text" && "h-4 w-full rounded",
        variant === "circle" && "h-12 w-12 rounded-full",
        variant === "rect" && "h-24 w-full rounded-lg",
        className
      )}
      {...props}
    />
  );
}
