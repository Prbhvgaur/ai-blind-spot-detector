"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type LoginForm = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();
  const { register, handleSubmit, formState } = useForm<LoginForm>();
  const googleAuthEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader className="font-display text-3xl text-white">Login</CardHeader>
        <CardContent className="space-y-4">
          <form
            className="space-y-4"
            onSubmit={handleSubmit(async (values) => {
              const result = await signIn("credentials", {
                email: values.email,
                password: values.password,
                redirect: false
              });

              if (!result?.error) {
                router.push("/dashboard");
              }
            })}
          >
            <Input type="email" placeholder="Email" {...register("email", { required: true })} />
            <Input
              type="password"
              placeholder="Password"
              {...register("password", { required: true })}
            />
            <Button className="w-full" disabled={formState.isSubmitting}>
              Enter The Dashboard
            </Button>
          </form>
          {googleAuthEnabled ? (
            <>
              <div className="text-center text-xs uppercase tracking-[0.3em] text-white/50">or</div>
              <Button
                className="w-full"
                type="button"
                variant="outline"
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              >
                Continue With Google
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
