"use client";

interface StatusIndicatorProps {
  connected: boolean;
  label?: string;
}

export default function StatusIndicator({
  connected,
  label,
}: StatusIndicatorProps) {
  return (
    <span className="flex items-center gap-2 text-xs font-medium">
      <span className="relative flex h-2 w-2">
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-75 pulse-ring ${
            connected ? "bg-accent" : "bg-destructive"
          }`}
        />
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            connected ? "bg-accent" : "bg-destructive"
          }`}
        />
      </span>
      <span className={connected ? "text-accent" : "text-destructive"}>
        {label || (connected ? "Connected" : "Disconnected")}
      </span>
    </span>
  );
}
