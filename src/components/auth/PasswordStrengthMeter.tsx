import { cn } from "@/lib/utils"
import type { PasswordStrengthLevel } from "@/components/auth/hooks/usePasswordStrength"

interface PasswordStrengthMeterProps {
  level: PasswordStrengthLevel
  score: number
  label: string
  className?: string
}

const LEVEL_TO_SEGMENT_COUNT: Record<PasswordStrengthLevel, number> = {
  weak: 1,
  fair: 2,
  strong: 3,
}

const LEVEL_TO_COLOR: Record<PasswordStrengthLevel, string> = {
  weak: "bg-destructive",
  fair: "bg-amber-400",
  strong: "bg-emerald-500",
}

export function PasswordStrengthMeter({ level, score, label, className }: PasswordStrengthMeterProps) {
  const activeSegments = LEVEL_TO_SEGMENT_COUNT[level]

  return (
    <div className={cn("space-y-2", className)} role="status" aria-live="polite">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>Password strength</span>
        <span>{label}</span>
      </div>

      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, index) => {
          const isActive = index < activeSegments

          return (
            <span
              key={index}
              className={cn(
                "h-2 flex-1 rounded-full bg-muted transition-colors",
                isActive && LEVEL_TO_COLOR[level],
                !isActive && "bg-muted"
              )}
            />
          )
        })}
      </div>

      <span className="sr-only">Password strength score: {score} of 2</span>
    </div>
  )
}
