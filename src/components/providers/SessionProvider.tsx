"use client";

import { ClerkProvider } from "@clerk/nextjs";

export default function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClerkProvider>{children}</ClerkProvider>;
}
