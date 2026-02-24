"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { Activity } from "lucide-react";

interface ECGGraphProps {
  data: number[];
}

export default function ECGGraph({ data }: ECGGraphProps) {
  const chartData = useMemo(() => {
    return data.map((value, index) => ({
      time: index,
      value: value,
    }));
  }, [data]);

  const avgValue = useMemo(() => {
    if (data.length === 0) return 0;
    return data.reduce((a, b) => a + b, 0) / data.length;
  }, [data]);

  return (
    <div className="bg-card rounded-lg border border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/10 rounded-lg">
            <Activity className="text-accent" size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Live ECG Waveform
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              AD8232 Analog Signal -- Real-time 1Hz refresh
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-[2px] rounded-full bg-accent" />
            <span className="text-[10px] text-muted-foreground">Lead I</span>
          </div>
          <div className="px-2.5 py-1 rounded-md bg-secondary text-[10px] font-medium text-muted-foreground font-mono">
            AVG: {avgValue.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4 pt-3">
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 12, left: -10, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="2 6"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis dataKey="time" hide />
              <YAxis
                domain={["auto", "auto"]}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <ReferenceLine
                y={avgValue}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                strokeOpacity={0.4}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "11px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
                itemStyle={{ color: "hsl(var(--accent))" }}
                labelStyle={{ display: "none" }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--accent))"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
