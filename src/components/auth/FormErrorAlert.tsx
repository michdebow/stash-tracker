import { AlertCircle } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"

interface FormErrorAlertProps {
  message: string | null
}

export function FormErrorAlert({ message }: FormErrorAlertProps) {
  if (!message) {
    return null
  }

  return (
    <Alert variant="destructive" className="border border-destructive/40 bg-destructive/10">
      <AlertCircle className="size-4" aria-hidden="true" />
      <AlertDescription className="pl-6 text-sm font-medium text-destructive">
        {message}
      </AlertDescription>
    </Alert>
  )
}
