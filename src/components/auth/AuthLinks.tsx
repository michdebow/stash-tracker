import { cn } from "@/lib/utils";

interface AuthLinksProps {
  variant?: "stacked" | "inline";
  className?: string;
}

export function AuthLinks({ variant = "inline", className }: AuthLinksProps) {
  const stacked = variant === "stacked";

  return (
    <nav
      aria-label="Authentication navigation"
      className={cn(
        "text-sm text-muted-foreground",
        stacked ? "flex flex-col gap-2" : "flex items-center gap-3",
        className
      )}
    >
      <a href="/register" className="font-medium text-primary hover:underline">
        Create an account
      </a>
      <span aria-hidden="true" className={stacked ? "hidden" : "text-border"} />
      <a href="/reset-password" className="font-medium text-primary hover:underline">
        Forgot password?
      </a>
    </nav>
  );
}
