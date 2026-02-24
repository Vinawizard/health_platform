"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { SensorData } from "@/lib/api";

interface VitalsHistoryProps {
  history: SensorData[];
}

export default function VitalsHistory({ history }: VitalsHistoryProps) {
  const chartData = useMemo(() => {
    return [...history].reverse().map((entry, index) => ({
      index,
      time: new Date(entry.timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      bpm: entry.pulse_bpm,
      spo2: entry.spo2_percent,
      temp: entry.temperature_f,
    }));
  }, [history]);

  if (history.length < 2) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 flex items-center justify-center text-muted-foreground text-sm">
        Collecting history data...
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <TrendingUp className="text-primary" size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Vitals Trend
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Last {history.length} readings -- Heart rate over time
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-[2px] rounded-full bg-primary" />
            <span className="text-[10px] text-muted-foreground">BPM</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4 pt-3">
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 12, left: -10, bottom: 4 }}
            >
              <defs>
                <linearGradient id="bpmGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="2 6"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "11px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
                itemStyle={{ color: "hsl(var(--primary))" }}
                labelFormatter={(_, payload) => {
                  if (payload && payload[0]) {
                    return `Time: ${payload[0].payload.time}`;
                  }
                  return "";
                }}
              />
              <Area
                type="monotone"
                dataKey="bpm"
                stroke="hsl(var(--primary))"
                strokeWidth={1.5}
                fill="url(#bpmGradient)"
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
