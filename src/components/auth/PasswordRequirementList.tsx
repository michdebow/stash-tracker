import { CheckCircle2, Circle } from "lucide-react"

import type { PasswordRequirementDisplay } from "@/components/auth/hooks/usePasswordStrength"
import { cn } from "@/lib/utils"

interface PasswordRequirementListProps {
  requirements: PasswordRequirementDisplay[]
  className?: string
  describedById?: string
}

export function PasswordRequirementList({ requirements, className, describedById }: PasswordRequirementListProps) {
  return (
    <div className={cn("space-y-2", className)} aria-live="polite">
      <p id={describedById} className="text-sm font-medium text-muted-foreground">
        Password must include
      </p>

      <ul className="space-y-1 text-sm" aria-describedby={describedById}>
        {requirements.map((requirement) => {
          const Icon = requirement.isMet ? CheckCircle2 : Circle

          return (
            <li key={requirement.id} className="flex items-center gap-2 text-muted-foreground">
              <Icon
                className={cn(
                  "size-4 transition-colors",
                  requirement.isMet ? "text-emerald-500" : "text-muted-foreground/60"
                )}
                aria-hidden="true"
              />
              <span className={requirement.isMet ? "text-foreground" : undefined}>{requirement.label}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
