import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "ghost" | "destructive" | "subtle";
type ButtonSize = "sm" | "md";

export function Button({
  className,
  variant = "default",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        size === "md" && "h-9 px-4",
        size === "sm" && "h-8 px-3 text-[13px]",
        variant === "default" &&
          "bg-emerald-700 text-white shadow-sm hover:bg-emerald-800",
        variant === "outline" &&
          "border border-stone-300 bg-white text-stone-700 shadow-sm hover:border-stone-400 hover:bg-stone-50",
        variant === "ghost" && "text-stone-600 hover:bg-stone-200/60",
        variant === "destructive" &&
          "bg-white text-red-700 border border-red-200 shadow-sm hover:bg-red-50",
        variant === "subtle" && "bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
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
      className={cn(
        "rounded-xl border border-stone-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(28,25,23,0.05)]",
        className,
      )}
      {...props}
    />
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 placeholder:text-stone-400 shadow-sm outline-none transition-colors focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20",
        props.className,
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-10 rounded-lg border border-stone-300 bg-white px-2.5 text-sm font-medium text-stone-700 shadow-sm outline-none transition-colors focus:border-emerald-600",
        props.className,
      )}
    />
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold tracking-wide text-stone-500 uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

const badgeTones: Record<string, string> = {
  green: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  amber: "bg-amber-100 text-amber-900 ring-amber-600/25",
  red: "bg-red-100 text-red-800 ring-red-600/20",
  blue: "bg-sky-100 text-sky-800 ring-sky-600/20",
  stone: "bg-stone-200/70 text-stone-700 ring-stone-500/10",
  violet: "bg-violet-100 text-violet-800 ring-violet-600/20",
};

export function Badge({
  tone = "stone",
  children,
}: {
  tone?: keyof typeof badgeTones;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        badgeTones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "approved"
      ? "green"
      : status === "pending"
        ? "amber"
        : status === "returned"
          ? "blue"
          : "stone";
  return <Badge tone={tone as keyof typeof badgeTones}>{status}</Badge>;
}

export function SectionTitle({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-3">
      <h2 className="text-lg font-bold tracking-tight text-stone-900">
        {children}
      </h2>
      {hint && <p className="mt-0.5 text-sm text-stone-500">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-stone-300 bg-stone-50/60 px-4 py-8 text-center">
      <div className="mb-1 text-stone-400">{icon}</div>
      <p className="text-sm font-semibold text-stone-700">{title}</p>
      {hint && <p className="text-sm text-stone-500">{hint}</p>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-xl bg-stone-200/70", className)} />
  );
}
