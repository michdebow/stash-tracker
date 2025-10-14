import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailCheck, MailWarning } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabaseClient } from "@/db/supabase.client";

const requestResetFormSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
});

export type RequestResetFormValues = z.infer<typeof requestResetFormSchema>;

type FormMessage = {
  type: "success" | "error";
  text: string;
};

export function RequestResetForm() {
  const form = useForm<RequestResetFormValues>({
    resolver: zodResolver(requestResetFormSchema),
    defaultValues: {
      email: "",
    },
    mode: "onBlur",
  });

  const [formMessage, setFormMessage] = useState<FormMessage | null>(null);

  const handleSubmit = async ({ email }: RequestResetFormValues) => {
    setFormMessage(null);

    const trimmedEmail = email.trim();
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/update-password` : undefined;

    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(trimmedEmail, redirectTo ? { redirectTo } : undefined);

      if (error) {
        console.error("Failed to request password reset", error);
        setFormMessage({
          type: "error",
          text: "An unexpected error occurred. Please try again.",
        });
        return;
      }

      form.reset();
      setFormMessage({
        type: "success",
        text: "If an account with this email exists, a password reset link has been sent.",
      });
    } catch (resetError) {
      console.error("Failed to request password reset", resetError);
      setFormMessage({
        type: "error",
        text: "An unexpected error occurred. Please try again.",
      });
    }
  };

  const showForm = formMessage?.type !== "success";

  return (
    <Card className="border border-border/40 bg-background/80 shadow-lg shadow-black/5 backdrop-blur">
      <CardHeader className="space-y-3 text-center">
        <CardTitle>Reset your password</CardTitle>
        <p className="text-sm text-muted-foreground">
          Enter the email address associated with your account and we&apos;ll send you instructions to reset your password.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {formMessage?.type === "error" && (
          <Alert variant="destructive" className="border border-destructive/40 bg-destructive/10">
            <MailWarning className="size-4" aria-hidden="true" />
            <AlertDescription className="pl-6 text-sm font-medium text-destructive">{formMessage.text}</AlertDescription>
          </Alert>
        )}

        {showForm ? (
          <Form {...form}>
            <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)} noValidate>
              <FormField
                name="email"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        aria-describedby="reset-password-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                Send reset link
              </Button>
            </form>
          </Form>
        ) : (
          <div className="space-y-4 text-center" role="status" aria-live="polite">
            <MailCheck className="mx-auto size-10 text-primary" aria-hidden="true" />
            <p className="text-base font-medium text-foreground">{formMessage?.text}</p>
            <p className="text-sm text-muted-foreground">
              Please check your inbox and follow the instructions to choose a new password.
            </p>
          </div>
        )}
      </CardContent>

      {showForm ? null : (
        <CardFooter className="flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => window.location.assign("/login")}>
            Return to sign in
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
