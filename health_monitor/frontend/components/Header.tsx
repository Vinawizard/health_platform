"use client";

import { Activity, Bell, Menu, Search } from "lucide-react";
import StatusIndicator from "./StatusIndicator";

interface HeaderProps {
  connected: boolean;
  alertCount: number;
  onMenuToggle?: () => void;
}

export default function Header({
  connected,
  alertCount,
  onMenuToggle,
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 lg:px-6 py-3 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
      {/* Left: Mobile menu + Page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          aria-label="Toggle menu"
        >
          <Menu size={18} />
        </button>

        {/* Mobile brand */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="p-1 bg-primary rounded-md">
            <Activity className="text-primary-foreground" size={12} />
          </div>
          <span className="text-sm font-bold text-foreground">VitalsIQ</span>
        </div>

        <div className="hidden lg:block">
          <h2 className="text-base font-semibold text-foreground">
            Patient Monitoring
          </h2>
          <p className="text-[10px] text-muted-foreground">
            Real-time IoT vitals dashboard
          </p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <StatusIndicator
          connected={connected}
          label={connected ? "Live 1Hz" : "Offline"}
        />

        <div className="w-px h-5 bg-border" />

        {/* Search (desktop) */}
        <button
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors"
          aria-label="Search"
        >
          <Search size={13} />
          <span>Search...</span>
          <kbd className="ml-4 px-1.5 py-0.5 rounded bg-secondary text-[9px] font-mono border border-border">
            /
          </kbd>
        </button>

        {/* Alerts */}
        <button
          className="relative p-2 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          aria-label={`Notifications: ${alertCount} alerts`}
        >
          <Bell size={16} />
          {alertCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
              {alertCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
