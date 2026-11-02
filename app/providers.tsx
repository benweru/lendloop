"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useMemo, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const convex = useMemo(
    () =>
      new ConvexReactClient(
        process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://placeholder.convex.cloud",
      ),
    [],
  );
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return <>{children}</>;
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

export function PlainConvexProvider({ children }: { children: ReactNode }) {
  const convex = useMemo(
    () =>
      new ConvexReactClient(
        process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://placeholder.convex.cloud",
      ),
    [],
  );
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
