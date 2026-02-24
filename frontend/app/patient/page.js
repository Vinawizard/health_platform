'use client';
import { useState, useEffect, useCallback } from 'react';
import { fetchLatestData, fetchHistory } from '../../lib/api';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import VitalCard from '../../components/VitalCard';
import AlertBanner from '../../components/AlertBanner';
import { Thermometer, Heart, Droplets, Wind, Clock, Activity, ExternalLink } from 'lucide-react';

export default function PatientDashboard() {
    const [data, setData] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [latest, hist] = await Promise.all([fetchLatestData(), fetchHistory()]);
            setData(latest);
            setHistory(hist);
            setError(null);
        } catch {
            setError('Unable to connect to monitoring backend');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 3000);
        return () => clearInterval(interval);
    }, [loadData]);

    const isTempCritical = data ? data.temperature_f > 100.4 : false;
    const isBpmCritical = data ? data.pulse_bpm > 100 : false;
    const isSpo2Critical = data ? data.spo2_percent < 90 : false;
    const isAirCritical = data ? data.air_quality_ppm > 1000 : false;
    const isAirWarning = data ? data.air_quality_ppm > 400 && data.air_quality_ppm <= 1000 : false;

    const alerts = [];
    if (isTempCritical && data) alerts.push(`High body temperature (${data.temperature_f.toFixed(1)}°F)`);
    if (isBpmCritical && data) alerts.push(`Tachycardia detected (${data.pulse_bpm} BPM)`);
    if (isSpo2Critical && data) alerts.push(`Low blood oxygen (${data.spo2_percent.toFixed(1)}%)`);
    if (isAirCritical && data) alerts.push(`Hazardous air quality (${data.air_quality_ppm.toFixed(0)} PPM)`);

    if (loading) {
        return (
            <div className="flex min-h-screen">
                <Sidebar />
                <div className="flex-1 flex flex-col">
                    <Header connected={false} alertCount={0} />
                    <main className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="p-4 bg-primary/10 rounded-2xl">
                                <Activity className="text-primary animate-pulse" size={32} />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-foreground">Connecting to sensors...</p>
                                <p className="text-xs text-muted-foreground mt-1">Establishing real-time data link</p>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    const anchoredCount = history.filter(r => r.anchored).length;

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar />

            {mobileMenuOpen && (
                <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setMobileMenuOpen(false)}>
                    <div className="w-[220px] h-full" onClick={e => e.stopPropagation()}>
                        <Sidebar />
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col min-w-0">
                <Header connected={!error} alertCount={alerts.length} onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />

                <main className="flex-1 p-4 lg:p-6 overflow-auto">
                    <div className="max-w-[1400px] mx-auto space-y-5">
                        <AlertBanner alerts={alerts} />

                        {error && !data && (
                            <div className="bg-card rounded-lg border border-border p-8 text-center">
                                <div className="p-3 bg-destructive/10 rounded-xl inline-flex mb-3">
                                    <Activity className="text-destructive" size={24} />
                                </div>
                                <h3 className="text-sm font-semibold text-foreground mb-1">Connection Lost</h3>
                                <p className="text-xs text-muted-foreground mb-4">{error}</p>
                                <button onClick={loadData} className="px-4 py-2 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:bg-primary/90 transition-colors">
                                    Retry Connection
                                </button>
                            </div>
                        )}

                        {data && (
                            <>
                                {/* Patient info bar */}
                                <div className="flex flex-wrap items-center justify-between gap-3 bg-card rounded-lg border border-border px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">P1</div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-foreground">Patient Monitor — Bed 1</h3>
                                            <p className="text-[10px] text-muted-foreground">ESP32 + DS18B20 + HW-827 + MAX30102 + MQ-135</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <Clock size={12} />
                                            <span className="font-mono">Last: {new Date(data.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                        <span className="font-semibold text-accent">{anchoredCount} anchored</span>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    <div className="bg-card rounded-lg border border-border px-4 py-3">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Readings</p>
                                        <p className="text-2xl font-bold text-foreground">{history.length}</p>
                                    </div>
                                    <div className="bg-card rounded-lg border border-border px-4 py-3">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">On-Chain</p>
                                        <p className="text-2xl font-bold text-accent">{anchoredCount}</p>
                                    </div>
                                    <div className="bg-card rounded-lg border border-border px-4 py-3">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Encryption</p>
                                        <p className="text-sm font-bold text-primary mt-1">AES-256-GCM</p>
                                    </div>
                                    <div className="bg-card rounded-lg border border-border px-4 py-3">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Network</p>
                                        <p className="text-sm font-bold text-warning mt-1">Preprod</p>
                                    </div>
                                </div>

                                {/* Cardano Tx */}
                                {data.cardano_tx_id && (
                                    <div className="flex items-center gap-3 bg-card rounded-lg border border-border px-4 py-2.5 text-[11px]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                                        <span className="text-muted-foreground">Latest Tx:</span>
                                        <a
                                            href={`https://preprod.cardanoscan.io/transaction/${data.cardano_tx_id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-mono text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                                        >
                                            {data.cardano_tx_id.slice(0, 16)}...{data.cardano_tx_id.slice(-8)}
                                            <ExternalLink size={10} />
                                        </a>
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        <span className="text-muted-foreground font-mono">Hash: {data.hash?.slice(0, 12)}...</span>
                                    </div>
                                )}

                                {/* Vital cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <VitalCard
                                        icon={<Thermometer size={18} className={isTempCritical ? 'text-destructive' : 'text-primary'} />}
                                        label="Body Temperature"
                                        value={data.temperature_f?.toFixed(1)}
                                        unit="°F"
                                        status={isTempCritical ? 'critical' : 'normal'}
                                        statusLabel={isTempCritical ? 'Fever' : 'Normal'}
                                        subtitle="DS18B20 Sensor"
                                    />
                                    <VitalCard
                                        icon={<Heart size={18} className={isBpmCritical ? 'text-destructive' : 'text-accent'} />}
                                        label="Heart Rate"
                                        value={data.pulse_bpm?.toString()}
                                        unit="BPM"
                                        status={isBpmCritical ? 'critical' : 'normal'}
                                        statusLabel={isBpmCritical ? 'Tachycardia' : 'Sinus Rhythm'}
                                        subtitle="HW-827 Pulse Sensor"
                                    />
                                    <VitalCard
                                        icon={<Droplets size={18} className={isSpo2Critical ? 'text-destructive' : 'text-primary'} />}
                                        label="SpO2 (Blood Oxygen)"
                                        value={data.spo2_percent?.toFixed(1)}
                                        unit="%"
                                        status={isSpo2Critical ? 'critical' : 'normal'}
                                        statusLabel={isSpo2Critical ? 'Hypoxia' : 'Adequate'}
                                        subtitle="MAX30102 Reflective"
                                    />
                                    <VitalCard
                                        icon={<Wind size={18} className={isAirCritical ? 'text-destructive' : isAirWarning ? 'text-warning' : 'text-accent'} />}
                                        label="Air Quality"
                                        value={data.air_quality_ppm?.toFixed(0)}
                                        unit="PPM"
                                        status={isAirCritical ? 'critical' : isAirWarning ? 'warning' : 'normal'}
                                        statusLabel={isAirCritical ? 'Hazardous' : isAirWarning ? 'Moderate' : 'Clean'}
                                        subtitle="MQ-135 Gas Sensor"
                                    />
                                </div>

                                {/* Recent readings */}
                                <div className="bg-card rounded-lg border border-border">
                                    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                                        <h3 className="text-xs font-semibold text-foreground">Recent Readings</h3>
                                        <span className="text-[10px] text-muted-foreground">{history.length} total</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-border">
                                                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Time</th>
                                                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Temp</th>
                                                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">BPM</th>
                                                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">SpO2</th>
                                                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Air</th>
                                                    <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Chain</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {history.slice(0, 10).map((r, i) => (
                                                    <tr key={i} className="border-b border-border/50 hover:bg-card-hover transition-colors">
                                                        <td className="px-4 py-2.5 font-mono text-muted-foreground">{new Date(r.timestamp).toLocaleTimeString()}</td>
                                                        <td className="px-4 py-2.5 text-foreground">{r.temperature_f ?? '—'}</td>
                                                        <td className="px-4 py-2.5 text-foreground">{r.pulse_bpm ?? '—'}</td>
                                                        <td className="px-4 py-2.5 text-foreground">{r.spo2_percent ?? '—'}</td>
                                                        <td className="px-4 py-2.5 text-foreground">{r.air_quality_ppm ?? '—'}</td>
                                                        <td className="px-4 py-2.5">
                                                            {r.anchored ? (
                                                                <a href={`https://preprod.cardanoscan.io/transaction/${r.cardano_tx_id}`} target="_blank" rel="noopener noreferrer"
                                                                    className="text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                                                                    Verified <ExternalLink size={10} />
                                                                </a>
                                                            ) : (
                                                                <span className="text-muted-foreground">Pending</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Metadata footer */}
                                <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-muted-foreground px-1">
                                    <div className="flex items-center gap-4">
                                        <span>Protocol: HTTPS + TLS 1.3</span>
                                        <span>Sampling: 3s refresh</span>
                                        <span>Encryption: AES-256-GCM envelope</span>
                                    </div>
                                    <span className="font-mono">VitalsIQ v2.0 — IoT Health Platform</span>
                                </div>
                            </>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
