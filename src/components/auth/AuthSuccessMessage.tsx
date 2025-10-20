import { CheckCircle2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";

interface AuthSuccessMessageProps {
  message: string;
}

/**
 * Success message component for authentication flows
 * Displays positive feedback after successful auth operations (e.g., password reset)
 */
export function AuthSuccessMessage({ message }: AuthSuccessMessageProps) {
  return (
    <Alert className="border-green-500/40 bg-green-500/10">
      <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" aria-hidden="true" />
      <AlertDescription className="pl-6 text-sm font-medium text-green-700 dark:text-green-300">
        {message}
      </AlertDescription>
    </Alert>
  );
}
