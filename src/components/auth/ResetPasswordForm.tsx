import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FormErrorAlert } from "@/components/auth/FormErrorAlert";

const resetPasswordFormSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters long"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .superRefine((data, ctx) => {
    if (data.password.trim() !== data.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password cannot include leading or trailing spaces",
      });
    }

    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords must match",
      });
    }
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;

export function ResetPasswordForm() {
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    mode: "onBlur",
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);

  // Check for recovery code in URL and verify with backend
  useEffect(() => {
    const checkRecoverySession = async () => {
      try {
        // Extract recovery code from URL query params
        if (typeof window === "undefined") return;

        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");

        if (!code) {
          setHasRecoverySession(false);
          setErrorMessage("This password reset link is invalid or has expired. Please request a new one.");
          return;
        }

        // Verify the recovery code with backend
        const response = await fetch("/api/auth/verify-recovery", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          setHasRecoverySession(false);
          setErrorMessage(
            errorData.message || "This password reset link is invalid or has expired. Please request a new one."
          );
          return;
        }

        // Valid recovery code - session established on backend
        setHasRecoverySession(true);
      } catch (err) {
        console.error("Failed to check recovery session", err);
        setHasRecoverySession(false);
        setErrorMessage("Unable to verify reset link. Please request a new one.");
      }
    };

    checkRecoverySession();
  }, []);

  const handleSubmit = async (values: ResetPasswordFormValues) => {
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: values.password,
          confirmPassword: values.confirmPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (response.status >= 500) {
          setErrorMessage("We couldn't update your password right now. Please try again later.");
        } else {
          setErrorMessage(errorData.message || "We couldn't update your password. Please try again.");
        }

        return;
      }

      // Successful password reset - redirect to login with success message
      if (typeof window !== "undefined") {
        const redirectUrl = new URL("/login", window.location.origin);
        redirectUrl.searchParams.set("message", "password-reset-success");
        window.location.assign(redirectUrl.toString());
      }
    } catch (updateError) {
      console.error("Failed to update password", updateError);
      setErrorMessage("We couldn't update your password. Please try again.");
    }
  };

  // Show loading state while checking recovery session
  if (hasRecoverySession === null) {
    return (
      <Card className="border border-border/40 bg-background/80 shadow-lg shadow-black/5 backdrop-blur">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Verifying reset link...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/40 bg-background/80 shadow-lg shadow-black/5 backdrop-blur">
      <CardHeader className="space-y-3 text-center">
        <CardTitle>Choose a new password</CardTitle>
        <p className="text-sm text-muted-foreground">
          Create a strong password to secure your account. Make sure it&apos;s at least 6 characters long.
        </p>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)} noValidate>
            <FormField
              name="password"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="confirmPassword"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm new password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormErrorAlert message={errorMessage} />

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || !hasRecoverySession}>
              {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              Set new password
            </Button>
          </form>
        </Form>
      </CardContent>

      <CardFooter className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 text-foreground">
          <ShieldCheck className="size-4" aria-hidden="true" />
          <span>Your session will refresh automatically after updating your password.</span>
        </div>
        <p>
          Need to start over?{" "}
          <a href="/reset-password" className="font-medium text-primary hover:underline">
            Request a new link
          </a>
          .
        </p>
      </CardFooter>
    </Card>
  );
}
