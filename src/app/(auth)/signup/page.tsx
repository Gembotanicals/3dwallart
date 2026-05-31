"use client";

import { SignUp } from "@clerk/nextjs";
import AuthLayout from "@/components/auth/AuthLayout";

export default function SignupPage() {
  return (
    <AuthLayout>
      <SignUp
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "bg-transparent shadow-none border-0 p-0",
          },
        }}
        forceRedirectUrl="/welcome"
      />
    </AuthLayout>
  );
}
