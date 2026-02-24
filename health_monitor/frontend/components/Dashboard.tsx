"use client";

import { useState, useEffect } from "react";
import { fetchLatestData, SensorData } from "@/lib/api";
import ECGGraph from "./ECGGraph";
import { Thermometer, Heart, Wind, AlertTriangle, Activity, Droplets } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export default function Dashboard() {
    const [data, setData] = useState<SensorData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const result = await fetchLatestData();
                setData(result);
                setError(null);
            } catch (err) {
                setError("Failed to connect to backend API");
            } finally {
                setLoading(false);
            }
        };

        loadData(); // Initial load
        const interval = setInterval(loadData, 1000); // Poll every second

        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin text-primary">
                    <Activity size={48} />
                </div>
            </div>
        );
    }

    const isTempCritical = data && data.temperature_f > 100;
    const isBpmCritical = data && data.pulse_bpm > 120;
    const isSpo2Critical = data && data.spo2_percent < 90;
    const isAirCritical = data && data.air_quality_ppm > 600;
    const isAirWarning = data && data.air_quality_ppm > 300 && data.air_quality_ppm <= 600;

    const hasAlerts = isTempCritical || isBpmCritical || isSpo2Critical || isAirCritical;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Vitals Dashboard</h1>
                    <p className="text-slate-400 mt-1">Real-time IoT Patient Monitoring</p>
                </div>
                <div className="flex items-center gap-2">
                    {error ? (
                        <span className="flex items-center text-danger text-sm font-medium">
                            <span className="w-2 h-2 rounded-full bg-danger animate-pulse mr-2"></span>
                            Disconnected
                        </span>
                    ) : (
                        <span className="flex items-center text-success text-sm font-medium">
                            <span className="w-2 h-2 rounded-full bg-success animate-pulse mr-2"></span>
                            Live (1Hz)
                        </span>
                    )}
                </div>
            </div>

            {hasAlerts && (
                <div className="bg-[#2a1318] border border-[#ef4444]/50 text-[#ef4444] p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center">
                    <AlertTriangle className="text-[#ef4444] flex-shrink-0" size={24} />
                    <div className="flex-1">
                        <h3 className="font-semibold text-[#ef4444]">Critical Alerts Detected</h3>
                        <ul className="list-disc list-inside text-sm mt-1">
                            {isTempCritical && <li>High Body Temperature ({data.temperature_f.toFixed(1)}°F)</li>}
                            {isBpmCritical && <li>Tachycardia Detected ({data.pulse_bpm} BPM)</li>}
                            {isSpo2Critical && <li>Low Blood Oxygen Saturation ({data.spo2_percent.toFixed(1)}%)</li>}
                            {isAirCritical && <li>Dangerous Air Quality ({data.air_quality_ppm.toFixed(1)} PPM)</li>}
                        </ul>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-warning/20 border border-warning/50 text-warning p-4 rounded-xl flex items-center gap-4">
                    <AlertTriangle size={24} />
                    <p>{error}</p>
                </div>
            )}

            {!data && !error && (
                <div className="text-center text-slate-400 py-12">No data available</div>
            )}

            {data && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    { }
                    <div className={cn(
                        "glass-card p-4 md:p-5 transition-all duration-300",
                        isTempCritical ? "border-[#ef4444]/50" : ""
                    )}>
                        <div className="flex justify-between items-start mb-3">
                            <Thermometer className={isTempCritical ? "text-[#ef4444]" : "text-[#38bdf8]"} size={20} />
                            <span className={cn(
                                "px-2.5 py-0.5 text-[10px] font-bold tracking-wider rounded-full",
                                isTempCritical ? "bg-[#3f191f] text-[#ef4444]" : "bg-[#113146] text-[#38bdf8]"
                            )}>
                                {isTempCritical ? "ALERT" : "NORMAL"}
                            </span>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium mb-1">Body Temperature</p>
                            <div className="flex items-baseline gap-1">
                                <span className={cn(
                                    "text-3xl font-bold tracking-tight",
                                    isTempCritical ? "text-[#ef4444]" : "text-white"
                                )}>
                                    {data.temperature_f.toFixed(1)}
                                </span>
                                <span className="text-sm text-slate-400">°F</span>
                            </div>
                        </div>
                    </div>

                    { }
                    <div className={cn(
                        "glass-card p-4 md:p-5 transition-all duration-300",
                        isBpmCritical ? "border-[#ef4444]/50" : ""
                    )}>
                        <div className="flex justify-between items-start mb-3">
                            <Heart className={cn(
                                isBpmCritical ? "text-[#ef4444]" : "text-[#10b981]",
                                "animate-pulse"
                            )} size={20} />
                            <span className={cn(
                                "px-2.5 py-0.5 text-[10px] font-bold tracking-wider rounded-full",
                                isBpmCritical ? "bg-[#3f191f] text-[#ef4444]" : "bg-[#103a31] text-[#10b981]"
                            )}>
                                {isBpmCritical ? "ALERT" : "NORMAL"}
                            </span>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium mb-1">Heart Rate</p>
                            <div className="flex items-baseline gap-1">
                                <span className={cn(
                                    "text-3xl font-bold tracking-tight",
                                    isBpmCritical ? "text-[#ef4444]" : "text-white"
                                )}>
                                    {data.pulse_bpm}
                                </span>
                                <span className="text-sm text-slate-400">BPM</span>
                            </div>
                        </div>
                    </div>

                    { }
                    <div className={cn(
                        "glass-card p-4 md:p-5 transition-all duration-300",
                        isSpo2Critical ? "border-[#ef4444]/50" : ""
                    )}>
                        <div className="flex justify-between items-start mb-3">
                            <Droplets className={isSpo2Critical ? "text-[#ef4444]" : "text-[#38bdf8]"} size={20} />
                            <span className={cn(
                                "px-2.5 py-0.5 text-[10px] font-bold tracking-wider rounded-full",
                                isSpo2Critical ? "bg-[#3f191f] text-[#ef4444]" : "bg-[#113146] text-[#38bdf8]"
                            )}>
                                {isSpo2Critical ? "ALERT" : "NORMAL"}
                            </span>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium mb-1">SpO2 (Blood Oxygen)</p>
                            <div className="flex items-baseline gap-1">
                                <span className={cn(
                                    "text-3xl font-bold tracking-tight",
                                    isSpo2Critical ? "text-[#ef4444]" : "text-white"
                                )}>
                                    {data.spo2_percent.toFixed(1)}
                                </span>
                                <span className="text-sm text-slate-400">%</span>
                            </div>
                        </div>
                    </div>

                    { }
                    <div className={cn(
                        "glass-card p-4 md:p-5 transition-all duration-300",
                        isAirCritical ? "border-[#ef4444]/50" :
                            isAirWarning ? "border-[#f59e0b]/50" : ""
                    )}>
                        <div className="flex justify-between items-start mb-3">
                            <Wind className={
                                isAirCritical ? "text-[#ef4444]" :
                                    isAirWarning ? "text-[#f59e0b]" : "text-[#10b981]"
                            } size={20} />
                            <span className={cn(
                                "px-2.5 py-0.5 text-[10px] font-bold tracking-wider rounded-full",
                                isAirCritical ? "bg-[#3f191f] text-[#ef4444]" :
                                    isAirWarning ? "bg-[#402a11] text-[#f59e0b]" : "bg-[#103a31] text-[#10b981]"
                            )}>
                                {isAirCritical ? "POOR" : isAirWarning ? "FAIR" : "GOOD"}
                            </span>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium mb-1">Air Quality</p>
                            <div className="flex items-baseline gap-1">
                                <span className={cn(
                                    "text-3xl font-bold tracking-tight",
                                    isAirCritical ? "text-[#ef4444]" :
                                        isAirWarning ? "text-[#f59e0b]" : "text-white"
                                )}>
                                    {data.air_quality_ppm.toFixed(0)}
                                </span>
                                <span className="text-sm text-slate-400">PPM</span>
                            </div>
                        </div>
                    </div>

                    { }
                    <div className="glass-card p-4 md:p-5 md:col-span-2 lg:col-span-4">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-[#103a31] rounded-md">
                                    <Activity className="text-[#10b981]" size={16} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-white">Live ECG Waveform</h3>
                                    <p className="text-[10px] text-slate-400">Real-time analog signal (AD8232)</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#0b1120] rounded-lg p-3 border border-[#1f2937]">
                            <ECGGraph data={data.ecg_wave} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
