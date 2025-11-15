import { cn } from "@/lib/utils";

interface AuthLinksProps {
  variant?: "stacked" | "inline";
  className?: string;
  location: "register" | "login";
}

export function AuthLinks({ variant = "inline", className, location }: AuthLinksProps) {
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
      {location === "register" && (
        <a href="/login" className="font-medium text-primary hover:underline">
          Already have an account? Login here.
        </a>
      )}

      {location === "login" && (
        <a href="/register" className="font-medium text-primary hover:underline">
          Don't have an account? Register here.
        </a>
      )}

      <span aria-hidden="true" className={stacked ? "hidden" : "text-border"} />
      <a href="/reset-password" className="font-medium text-primary hover:underline">
        Forgot password?
      </a>
    </nav>
  );
}
