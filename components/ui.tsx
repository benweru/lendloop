import * as React from "react";
import { cn } from "@/lib/utils";

export function Button({
  className,
  variant = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "destructive";
}) {
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors disabled:opacity-50",
        variant === "default" && "bg-zinc-900 text-white hover:bg-zinc-700",
        variant === "outline" &&
          "border border-zinc-300 bg-white hover:bg-zinc-100",
        variant === "ghost" && "hover:bg-zinc-100",
        variant === "destructive" && "bg-red-600 text-white hover:bg-red-500",
        className,
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-zinc-200 bg-white p-4", className)}
      {...props}
    />
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-500"
      {...props}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm outline-none focus:border-zinc-500"
      {...props}
    />
  );
}

export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
      {children}
    </span>
  );
}
