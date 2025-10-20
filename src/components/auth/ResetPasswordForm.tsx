import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FormErrorAlert } from "@/components/auth/FormErrorAlert";
import { supabaseClient } from "@/db/supabase.client";

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

  const handleSubmit = async (values: ResetPasswordFormValues) => {
    setErrorMessage(null);

    try {
      const { error } = await supabaseClient.auth.updateUser({
        password: values.password,
      });

      if (error) {
        const message = error.message?.toLowerCase().includes("expired")
          ? "This password reset link is invalid or has expired. Please request a new one."
          : "We couldn't update your password. Please try again.";

        setErrorMessage(message);
        return;
      }

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

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
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
          Need to start over? <a href="/reset-password" className="font-medium text-primary hover:underline">Request a new link</a>.
        </p>
      </CardFooter>
    </Card>
  );
}
