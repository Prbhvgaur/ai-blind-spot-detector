"use client";

import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type RegisterForm = {
  name: string;
  email: string;
  password: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const { register, handleSubmit, formState } = useForm<RegisterForm>();
  const googleAuthEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader className="font-display text-3xl text-white">Create Your Account</CardHeader>
        <CardContent className="space-y-4">
          <form
            className="space-y-4"
            onSubmit={handleSubmit(async (values) => {
              await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values)
              });

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
            <Input placeholder="Name" {...register("name", { required: true })} />
            <Input type="email" placeholder="Email" {...register("email", { required: true })} />
            <Input
              type="password"
              placeholder="Password"
              {...register("password", { required: true })}
            />
            <Button className="w-full" disabled={formState.isSubmitting}>
              Start Free
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
                Sign Up With Google
              </Button>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
