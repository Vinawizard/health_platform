"use client";

import {
  Activity,
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  Shield,
  Bell,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Users, label: "Patients", active: false },
  { icon: FileText, label: "Records", active: false },
  { icon: Bell, label: "Alerts", active: false },
  { icon: Shield, label: "Privacy", active: false },
  { icon: Settings, label: "Settings", active: false },
];

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-[220px] border-r border-border bg-card min-h-screen">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <div className="p-1.5 bg-primary rounded-lg">
          <Activity className="text-primary-foreground" size={16} />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-foreground">
            VitalsIQ
          </h1>
          <p className="text-[9px] text-muted-foreground tracking-wider uppercase">
            Clinical Monitor
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1" role="navigation">
          {navItems.map((item) => (
            <li key={item.label}>
              <button
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  item.active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer info */}
      <div className="px-4 py-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
            DR
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">
              Dr. Clinician
            </p>
            <p className="text-[10px] text-muted-foreground">ICU Ward 3</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
