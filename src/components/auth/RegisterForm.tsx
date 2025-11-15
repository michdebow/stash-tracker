import { useId, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AuthLinks } from "@/components/auth/AuthLinks";
import { FormErrorAlert } from "@/components/auth/FormErrorAlert";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordRequirementList } from "@/components/auth/PasswordRequirementList";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { usePasswordStrength } from "@/components/auth/hooks/usePasswordStrength";

const registerFormSchema = z
  .object({
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters long")
      .regex(/[^A-Za-z0-9]/, "Include at least one special character"),
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

export type RegisterFormValues = z.infer<typeof registerFormSchema>;

export function RegisterForm() {
  const requirementDescriptionId = useId();
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onBlur",
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const passwordValue = form.watch("password");
  const passwordStrength = usePasswordStrength(passwordValue);

  const hasUnmetRequirements = passwordStrength.requirements.some((requirement) => !requirement.isMet);
  // Only require the password to not be weak
  const isStrengthSufficient = passwordStrength.level !== "weak";
  const isSubmitDisabled = form.formState.isSubmitting || hasUnmetRequirements || !isStrengthSufficient;

  const handleSubmit = async (values: RegisterFormValues) => {
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: values.email.trim(),
          password: values.password,
          confirmPassword: values.confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors
        if (response.status === 400 && "errors" in data) {
          setErrorMessage(data.message ?? "Please check your input and try again.");
          return;
        }

        // Handle other errors
        setErrorMessage(data.message ?? "We couldn't create your account. Please try again.");
        return;
      }

      // Registration successful, redirect to dashboard
      window.location.assign("/app/dashboard");
    } catch (error) {
      console.error("Failed to register", error);
      setErrorMessage("We couldn't create your account right now. Please try again later.");
    }
  };

  return (
    <div className="space-y-6 rounded-xl border border-border/40 bg-background/80 p-8 shadow-lg shadow-black/5 backdrop-blur">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Create your free account</h2>
        <p className="text-sm text-muted-foreground">
          Start tracking your stashes, budgets, and savings progress in a single dashboard.
        </p>
      </div>

      <Form {...form}>
        <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)} noValidate>
          <FormField
            name="email"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="password"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••••••"
                    aria-describedby={requirementDescriptionId}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
                <PasswordStrengthMeter
                  className="mt-3"
                  level={passwordStrength.level}
                  score={passwordStrength.score}
                  label={passwordStrength.label}
                />
                <PasswordRequirementList
                  className="mt-3"
                  describedById={requirementDescriptionId}
                  requirements={passwordStrength.requirements}
                />
              </FormItem>
            )}
          />

          <FormField
            name="confirmPassword"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="new-password" placeholder="••••••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormErrorAlert message={errorMessage} />

          <Button type="submit" className="w-full" disabled={isSubmitDisabled}>
            {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Create account
          </Button>

          {(hasUnmetRequirements || !isStrengthSufficient) && (
            <p className="text-center text-xs text-muted-foreground">
              Complete all password requirements to enable account creation.
            </p>
          )}
        </form>
      </Form>

      <div className="space-y-4 text-center text-sm text-muted-foreground">
        <p>
          By creating an account, you agree to our privacy practices designed to keep your financial data secure and
          encrypted.
        </p>
        <AuthLinks variant="stacked" className="text-center" location="register" />
      </div>
    </div>
  );
}
