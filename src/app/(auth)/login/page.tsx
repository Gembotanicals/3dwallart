"use client";

import { SignIn } from "@clerk/nextjs";
import AuthLayout from "@/components/auth/AuthLayout";

export default function LoginPage() {
  return (
    <AuthLayout>
      <SignIn
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "bg-transparent shadow-none border-0 p-0",
          },
        }}
        redirectUrl="/dashboard"
      />
    </AuthLayout>
  );
}
