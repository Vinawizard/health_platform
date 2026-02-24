"use client";

import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

interface AlertBannerProps {
  alerts: string[];
}

export default function AlertBanner({ alerts }: AlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || alerts.length === 0) return null;

  return (
    <div className="relative bg-destructive/5 border border-destructive/20 rounded-lg p-4 flex gap-3">
      <div className="flex-shrink-0 p-1.5 bg-destructive/10 rounded-md self-start mt-0.5">
        <AlertTriangle className="text-destructive" size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-destructive mb-1">
          Critical Alert{alerts.length > 1 ? "s" : ""} Detected
        </h3>
        <ul className="space-y-0.5">
          {alerts.map((alert, i) => (
            <li
              key={i}
              className="text-xs text-destructive/80 flex items-center gap-2"
            >
              <span className="w-1 h-1 rounded-full bg-destructive/60 flex-shrink-0" />
              {alert}
            </li>
          ))}
        </ul>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 p-1 rounded-md text-destructive/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
        aria-label="Dismiss alert"
      >
        <X size={14} />
      </button>
    </div>
  );
}
