"use client";

import { type ReactNode } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type VitalStatus = "normal" | "warning" | "critical";

interface VitalCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  unit: string;
  status: VitalStatus;
  statusLabel: string;
  subtitle?: string;
}

const statusConfig: Record<
  VitalStatus,
  { bg: string; text: string; badge: string; border: string; ring: string }
> = {
  normal: {
    bg: "bg-accent/8",
    text: "text-accent",
    badge: "bg-accent/10 text-accent",
    border: "border-border",
    ring: "bg-accent",
  },
  warning: {
    bg: "bg-warning/8",
    text: "text-warning",
    badge: "bg-warning/10 text-warning",
    border: "border-warning/30",
    ring: "bg-warning",
  },
  critical: {
    bg: "bg-destructive/8",
    text: "text-destructive",
    badge: "bg-destructive/10 text-destructive",
    border: "border-destructive/30",
    ring: "bg-destructive",
  },
};

export default function VitalCard({
  icon,
  label,
  value,
  unit,
  status,
  statusLabel,
  subtitle,
}: VitalCardProps) {
  const config = statusConfig[status];

  return (
    <div
      className={cn(
        "relative bg-card rounded-lg border p-5 transition-all duration-300 hover:shadow-md group",
        config.border,
        status === "critical" && "animate-breathe"
      )}
    >
      {/* Top row: icon + status badge */}
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-2.5 rounded-lg", config.bg)}>{icon}</div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span
              className={cn(
                "absolute inline-flex h-full w-full rounded-full opacity-75 pulse-ring",
                config.ring
              )}
            />
            <span
              className={cn(
                "relative inline-flex rounded-full h-2 w-2",
                config.ring
              )}
            />
          </span>
          <span
            className={cn(
              "text-[10px] font-bold tracking-widest uppercase",
              config.text
            )}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Label */}
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>

      {/* Value row */}
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "text-3xl font-bold tracking-tight font-mono tabular-nums",
            status === "critical"
              ? "text-destructive"
              : status === "warning"
              ? "text-warning"
              : "text-foreground"
          )}
        >
          {value}
        </span>
        <span className="text-sm font-medium text-muted-foreground">{unit}</span>
      </div>

      {/* Optional subtitle */}
      {subtitle && (
        <p className="text-[10px] text-muted-foreground mt-2">{subtitle}</p>
      )}

      {/* Subtle bottom accent bar */}
      <div
        className={cn(
          "absolute bottom-0 left-3 right-3 h-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity",
          config.ring
        )}
      />
    </div>
  );
}
