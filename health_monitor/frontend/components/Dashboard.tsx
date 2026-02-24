"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchLatestData, fetchHistory, SensorData } from "@/lib/api";
import ECGGraph from "./ECGGraph";
import VitalCard from "./VitalCard";
import AlertBanner from "./AlertBanner";
import VitalsHistory from "./VitalsHistory";
import Header from "./Header";
import Sidebar from "./Sidebar";
import {
  Thermometer,
  Heart,
  Droplets,
  Wind,
  Activity,
  Clock,
} from "lucide-react";

export default function Dashboard() {
  const [data, setData] = useState<SensorData | null>(null);
  const [history, setHistory] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [latest, hist] = await Promise.all([
        fetchLatestData(),
        fetchHistory(),
      ]);
      setData(latest);
      setHistory(hist);
      setError(null);
    } catch {
      setError("Unable to connect to monitoring backend");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 1000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Compute alert states
  const isTempCritical = data ? data.temperature_f > 100 : false;
  const isBpmCritical = data ? data.pulse_bpm > 120 : false;
  const isSpo2Critical = data ? data.spo2_percent < 90 : false;
  const isAirCritical = data ? data.air_quality_ppm > 600 : false;
  const isAirWarning =
    data ? data.air_quality_ppm > 300 && data.air_quality_ppm <= 600 : false;

  const alerts: string[] = [];
  if (isTempCritical && data)
    alerts.push(`High body temperature (${data.temperature_f.toFixed(1)} F)`);
  if (isBpmCritical && data)
    alerts.push(`Tachycardia detected (${data.pulse_bpm} BPM)`);
  if (isSpo2Critical && data)
    alerts.push(
      `Low blood oxygen saturation (${data.spo2_percent.toFixed(1)}%)`
    );
  if (isAirCritical && data)
    alerts.push(
      `Dangerous air quality (${data.air_quality_ppm.toFixed(1)} PPM)`
    );

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header connected={false} alertCount={0} />
          <main className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-primary/10 rounded-2xl">
                <Activity
                  className="text-primary animate-pulse"
                  size={32}
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Connecting to sensors...
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Establishing real-time data link
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-[220px] h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          connected={!error}
          alertCount={alerts.length}
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="max-w-[1400px] mx-auto space-y-5">
            {/* Alerts */}
            <AlertBanner alerts={alerts} />

            {/* Error state */}
            {error && !data && (
              <div className="bg-card rounded-lg border border-border p-8 text-center">
                <div className="p-3 bg-destructive/10 rounded-xl inline-flex mb-3">
                  <Activity className="text-destructive" size={24} />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  Connection Lost
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {error}
                </p>
                <button
                  onClick={loadData}
                  className="px-4 py-2 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:bg-primary/90 transition-colors"
                >
                  Retry Connection
                </button>
              </div>
            )}

            {data && (
              <>
                {/* Patient info bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-card rounded-lg border border-border px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      P1
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Patient Monitor -- Bed 1
                      </h3>
                      <p className="text-[10px] text-muted-foreground">
                        ESP32 + AD8232 + MAX30102 + MQ135
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Clock size={12} />
                    <span className="font-mono">
                      Last update:{" "}
                      {new Date(data.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Vital cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <VitalCard
                    icon={
                      <Thermometer
                        size={18}
                        className={
                          isTempCritical
                            ? "text-destructive"
                            : "text-primary"
                        }
                      />
                    }
                    label="Body Temperature"
                    value={data.temperature_f.toFixed(1)}
                    unit="F"
                    status={isTempCritical ? "critical" : "normal"}
                    statusLabel={isTempCritical ? "Fever" : "Normal"}
                    subtitle="MLX90614 IR Sensor"
                  />
                  <VitalCard
                    icon={
                      <Heart
                        size={18}
                        className={
                          isBpmCritical
                            ? "text-destructive"
                            : "text-accent"
                        }
                      />
                    }
                    label="Heart Rate"
                    value={data.pulse_bpm.toString()}
                    unit="BPM"
                    status={isBpmCritical ? "critical" : "normal"}
                    statusLabel={
                      isBpmCritical ? "Tachycardia" : "Sinus Rhythm"
                    }
                    subtitle="MAX30102 Pulse Oximeter"
                  />
                  <VitalCard
                    icon={
                      <Droplets
                        size={18}
                        className={
                          isSpo2Critical
                            ? "text-destructive"
                            : "text-primary"
                        }
                      />
                    }
                    label="SpO2 (Blood Oxygen)"
                    value={data.spo2_percent.toFixed(1)}
                    unit="%"
                    status={isSpo2Critical ? "critical" : "normal"}
                    statusLabel={isSpo2Critical ? "Hypoxia" : "Adequate"}
                    subtitle="MAX30102 Reflective"
                  />
                  <VitalCard
                    icon={
                      <Wind
                        size={18}
                        className={
                          isAirCritical
                            ? "text-destructive"
                            : isAirWarning
                            ? "text-warning"
                            : "text-accent"
                        }
                      />
                    }
                    label="Air Quality"
                    value={data.air_quality_ppm.toFixed(0)}
                    unit="PPM"
                    status={
                      isAirCritical
                        ? "critical"
                        : isAirWarning
                        ? "warning"
                        : "normal"
                    }
                    statusLabel={
                      isAirCritical
                        ? "Hazardous"
                        : isAirWarning
                        ? "Moderate"
                        : "Clean"
                    }
                    subtitle="MQ135 Gas Sensor"
                  />
                </div>

                {/* ECG + History row */}
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
                  <div className="xl:col-span-3">
                    <ECGGraph data={data.ecg_wave} />
                  </div>
                  <div className="xl:col-span-2">
                    <VitalsHistory history={history} />
                  </div>
                </div>

                {/* Bottom metadata */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-muted-foreground px-1">
                  <div className="flex items-center gap-4">
                    <span>Protocol: HTTPS + TLS 1.3</span>
                    <span>Sampling: 1 Hz</span>
                    <span>ECG Samples: {data.ecg_wave.length} pts</span>
                  </div>
                  <span className="font-mono">
                    VitalsIQ v1.0 -- IoT Health Platform
                  </span>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
