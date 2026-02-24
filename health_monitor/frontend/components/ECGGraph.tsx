"use client";

import { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';

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

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="time" hide />
                    <YAxis domain={['auto', 'auto']} stroke="#94a3b8" />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
                        itemStyle={{ color: '#10b981' }}
                        labelStyle={{ display: 'none' }}
                    />
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false} // Disable animation for smoother continuous flow if updating every 1s
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
