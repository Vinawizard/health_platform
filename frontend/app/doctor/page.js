'use client';
import { useState, useEffect, useCallback } from 'react';
import { fetchLatestProofs, fetchHealthCertificate, verifyClaim, fetchComplianceReport } from '../../lib/api';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { Shield, Award, FileCheck, BarChart3, ExternalLink, AlertTriangle, Activity, Clock, ChevronDown, ChevronUp } from 'lucide-react';

// Format UTC timestamp to local 12-hour
function formatLocalTime(ts) {
    if (!ts) return '—';
    try {
        let str = typeof ts === 'string' ? ts : ts.toString();
        if (!str.endsWith('Z') && !str.includes('+')) str += 'Z';
        const d = new Date(str);
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    } catch {
        return String(ts);
    }
}

export default function DoctorDashboard() {
    const [proofs, setProofs] = useState(null);
    const [certificate, setCertificate] = useState(null);
    const [compliance, setCompliance] = useState(null);
    const [claimType, setClaimType] = useState('HYPOXIA');
    const [claimResult, setClaimResult] = useState(null);
    const [claimLoading, setClaimLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [proofLog, setProofLog] = useState([]);
    const [expandedProof, setExpandedProof] = useState(null);

    const loadData = useCallback(async () => {
        try {
            const [prfs, cert, comp] = await Promise.all([
                fetchLatestProofs(),
                fetchHealthCertificate(),
                fetchComplianceReport('spo2_percent', 50),
            ]);
            setProofs(prfs);
            setCertificate(cert);
            setCompliance(comp);

            // Build real-time proof log entry
            if (prfs?.proofs) {
                const now = new Date();
                const alerts = [];
                const normals = [];
                prfs.proofs.forEach(p => {
                    if (p.circuit === 'vital_range_check') {
                        if (p.status === 'NORMAL') normals.push(p.label);
                        else alerts.push({ label: p.label, status: p.status });
                    }
                });

                const logEntry = {
                    time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
                    normals,
                    alerts,
                    proofCount: prfs.proofs.length,
                    certificate: cert?.certificate,
                    rawProofs: prfs.proofs,
                };

                setProofLog(prev => {
                    // Avoid duplicate entries within 2 seconds
                    if (prev.length > 0) {
                        const last = prev[0];
                        const lastAlertStr = JSON.stringify(last.alerts);
                        const newAlertStr = JSON.stringify(logEntry.alerts);
                        if (lastAlertStr === newAlertStr && last.normals.length === logEntry.normals.length) return prev;
                    }
                    return [logEntry, ...prev].slice(0, 50);
                });
            }

            setError(null);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 3000);
        return () => clearInterval(interval);
    }, [loadData]);

    async function handleVerifyClaim() {
        setClaimLoading(true);
        try {
            const res = await verifyClaim(claimType);
            setClaimResult(res.result);
        } catch (e) {
            setClaimResult({ error: e.message });
        }
        setClaimLoading(false);
    }

    const vitalProofs = proofs?.proofs?.filter(p => p.circuit === 'vital_range_check') || [];
    const claimProofs = proofs?.proofs?.filter(p => p.circuit === 'insurance_claim_proof') || [];
    const cert = certificate?.certificate;
    const compReport = compliance?.report;

    const gradeColors = { A: 'text-accent', B: 'text-primary', C: 'text-warning', F: 'text-destructive' };

    if (loading) {
        return (
            <div className="flex min-h-screen">
                <Sidebar />
                <div className="flex-1 flex flex-col">
                    <Header connected={false} alertCount={0} />
                    <main className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="p-4 bg-accent/10 rounded-2xl">
                                <Shield className="text-accent animate-pulse" size={32} />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-foreground">Verifying ZKP proofs...</p>
                                <p className="text-xs text-muted-foreground mt-1">No raw medical data is accessed</p>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar />

            {mobileMenuOpen && (
                <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setMobileMenuOpen(false)}>
                    <div className="w-[220px] h-full" onClick={e => e.stopPropagation()}><Sidebar /></div>
                </div>
            )}

            <div className="flex-1 flex flex-col min-w-0">
                <Header connected={!error} alertCount={claimProofs.length} onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />

                <main className="flex-1 p-4 lg:p-6 overflow-auto">
                    <div className="max-w-[1400px] mx-auto space-y-5">

                        {/* ZKP Notice */}
                        <div className="flex items-center gap-3 bg-accent/5 border border-accent/20 rounded-lg px-4 py-3">
                            <div className="p-1.5 bg-accent/10 rounded-md">
                                <Shield className="text-accent" size={14} />
                            </div>
                            <div>
                                <p className="text-[11px] text-accent font-semibold">Zero-Knowledge Proof Dashboard</p>
                                <p className="text-[10px] text-accent/60">You are viewing cryptographic proofs only. No raw vital signs or patient data are visible or transmitted to this view.</p>
                            </div>
                        </div>

                        {/* ═══════ SECTION 1: Real-Time ZKP Proof Log ═══════ */}
                        <div className="bg-card rounded-xl border border-border">
                            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Activity className="text-primary" size={16} />
                                    <h2 className="text-xs font-bold text-foreground">Live Proof Monitor</h2>
                                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
                                </div>
                                <span className="text-[10px] text-muted-foreground">Auto-refresh 3s · {proofLog.length} entries</span>
                            </div>

                            <div className="max-h-[320px] overflow-y-auto divide-y divide-border/30">
                                {proofLog.length === 0 ? (
                                    <div className="px-5 py-8 text-center text-xs text-muted-foreground">Waiting for proof data...</div>
                                ) : (
                                    proofLog.map((entry, i) => {
                                        const hasAlerts = entry.alerts.length > 0;
                                        const isExpanded = expandedProof === i;
                                        return (
                                            <div key={i} className={`px-5 py-3 ${i === 0 ? 'bg-primary/3' : ''}`}>
                                                {/* Log header */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <Clock size={11} className="text-muted-foreground" />
                                                        <span className="text-[11px] font-mono text-muted-foreground">{entry.time}</span>
                                                        <div className={`w-2 h-2 rounded-full ${hasAlerts ? 'bg-destructive' : 'bg-accent'}`} />
                                                        <span className={`text-xs font-semibold ${hasAlerts ? 'text-destructive' : 'text-accent'}`}>
                                                            {hasAlerts ? `${entry.alerts.length} ALERT${entry.alerts.length > 1 ? 'S' : ''}` : 'ALL NORMAL'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] text-muted-foreground">{entry.proofCount} proofs</span>
                                                        <button
                                                            onClick={() => setExpandedProof(isExpanded ? null : i)}
                                                            className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                                                            title="View proof JSON"
                                                        >
                                                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Status line */}
                                                <div className="mt-1.5 flex flex-wrap gap-2">
                                                    {entry.alerts.map((a, j) => (
                                                        <span key={j} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                                                            {a.label}: {a.status}
                                                        </span>
                                                    ))}
                                                    {entry.normals.length > 0 && (
                                                        <span className="text-[10px] text-accent/70">
                                                            ✓ {entry.normals.join(', ')}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Grade badge */}
                                                {entry.certificate && (
                                                    <div className="mt-1.5 flex items-center gap-2">
                                                        <span className={`text-[10px] font-bold ${gradeColors[entry.certificate.grade] || 'text-foreground'}`}>
                                                            Grade {entry.certificate.grade}
                                                        </span>
                                                        <span className="text-[9px] text-muted-foreground">
                                                            {entry.certificate.score}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Expandable Proof JSON */}
                                                {isExpanded && (
                                                    <div className="mt-3 bg-background rounded-lg border border-border/50 p-3 overflow-x-auto">
                                                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Raw ZKP Proof Data</p>
                                                        <pre className="text-[10px] font-mono text-primary/80 whitespace-pre-wrap break-all leading-relaxed">
                                                            {JSON.stringify(entry.rawProofs, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* ═══════ SECTION 2: Health Certificate ═══════ */}
                        {cert && (
                            <div className="bg-card rounded-xl border border-border p-6">
                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-accent/10 rounded-lg"><Award className="text-accent" size={18} /></div>
                                        <h2 className="text-sm font-bold text-foreground">Health Certificate</h2>
                                    </div>
                                    <span className="text-[10px] font-mono text-primary/60 bg-primary/5 px-2 py-1 rounded">
                                        Proof: {cert.proof_hash?.slice(0, 20)}...
                                    </span>
                                </div>

                                <div className="flex items-center gap-8 mb-5">
                                    <div className="text-center">
                                        <div className={`text-6xl font-black ${gradeColors[cert.grade] || 'text-foreground'}`}>{cert.grade}</div>
                                        <p className="text-[10px] text-muted-foreground mt-1">Overall Grade</p>
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-foreground">{cert.score}</p>
                                        <p className="text-xs text-muted-foreground">vitals in normal range</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    {cert.vitals && Object.entries(cert.vitals).map(([key, v]) => (
                                        <div key={key} className="bg-background rounded-lg p-3 border border-border/50">
                                            <p className="text-[10px] text-muted-foreground mb-1.5">{v.label}</p>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${v.status === 'NORMAL' ? 'bg-accent/10 text-accent' :
                                                    v.status === 'WARNING' ? 'bg-warning/10 text-warning' :
                                                        'bg-destructive/10 text-destructive'
                                                }`}>
                                                {v.status}
                                            </span>
                                            <p className="text-[9px] text-muted-foreground mt-1.5">No raw value visible</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ═══════ SECTION 3: Per-Vital ZKP Proofs ═══════ */}
                        <div className="bg-card rounded-xl border border-border">
                            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileCheck className="text-primary" size={16} />
                                    <h2 className="text-xs font-bold text-foreground">Vital Range Proofs (ZKP)</h2>
                                </div>
                                <span className="text-[10px] text-muted-foreground">{vitalProofs.length} proofs verified</span>
                            </div>
                            <div className="divide-y divide-border/50">
                                {vitalProofs.map((proof, i) => (
                                    <div key={i} className="px-5 py-3.5 hover:bg-card-hover transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-semibold text-foreground">{proof.label}</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">Normal range: {proof.normal_range}</p>
                                            </div>
                                            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${proof.status === 'NORMAL' ? 'bg-accent/10 text-accent' :
                                                    proof.status === 'WARNING' ? 'bg-warning/10 text-warning' :
                                                        'bg-destructive/10 text-destructive'
                                                }`}>
                                                {proof.status}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex items-center gap-3 text-[9px] font-mono text-muted-foreground">
                                            <span>Circuit: {proof.circuit}</span>
                                            <span>Proof: {proof.proof_hash?.slice(0, 24)}...</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ═══════ SECTION 4: Auto-Detected Events ═══════ */}
                        {claimProofs.length > 0 && (
                            <div className="bg-card rounded-xl border border-destructive/20">
                                <div className="px-5 py-3.5 border-b border-destructive/10 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="text-destructive" size={16} />
                                        <h2 className="text-xs font-bold text-foreground">Auto-Detected Clinical Events</h2>
                                    </div>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                                        {claimProofs.length} events
                                    </span>
                                </div>
                                <div className="divide-y divide-border/50">
                                    {claimProofs.map((proof, i) => (
                                        <div key={i} className="px-5 py-3.5 hover:bg-card-hover transition-colors">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs font-semibold text-foreground">{proof.claim_type}</p>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5">{proof.claim_description}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${proof.verified ? 'bg-destructive/10 text-destructive' : 'bg-accent/10 text-accent'
                                                        }`}>
                                                        {proof.verified ? 'CONFIRMED' : 'Not Detected'}
                                                    </span>
                                                    {proof.cardano_tx_id && (
                                                        <a href={proof.cardano_verify_url} target="_blank" rel="noopener noreferrer"
                                                            className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                                                            On-Chain <ExternalLink size={10} />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-2 text-[9px] font-mono text-muted-foreground">
                                                Proof: {proof.proof_hash?.slice(0, 32)}...
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ═══════ SECTION 5: Compliance Report ═══════ */}
                        {compReport && (
                            <div className="bg-card rounded-xl border border-border p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <BarChart3 className="text-primary" size={16} />
                                    <h2 className="text-xs font-bold text-foreground">Compliance — {compReport.label}</h2>
                                </div>
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <span className="text-3xl font-bold text-foreground">{compReport.compliance_percent}%</span>
                                        <span className="text-xs text-muted-foreground ml-2">compliance</span>
                                    </div>
                                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${compReport.status === 'COMPLIANT' ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'
                                        }`}>{compReport.status}</span>
                                </div>
                                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mb-3">
                                    <div className="h-full rounded-full transition-all duration-700" style={{
                                        width: `${compReport.compliance_percent}%`,
                                        background: compReport.compliance_percent >= 90 ? 'var(--color-accent)' :
                                            compReport.compliance_percent >= 70 ? 'var(--color-warning)' : 'var(--color-destructive)',
                                    }} />
                                </div>
                                <div className="flex gap-6 text-[11px] text-muted-foreground">
                                    <span>Safe: <strong className="text-accent">{compReport.safe_readings}</strong></span>
                                    <span>Warning: <strong className="text-warning">{compReport.warning_readings}</strong></span>
                                    <span>Critical: <strong className="text-destructive">{compReport.critical_readings}</strong></span>
                                    <span>Total: <strong className="text-foreground">{compReport.total_readings}</strong></span>
                                </div>
                            </div>
                        )}

                        {/* ═══════ SECTION 6: Insurance Claim Verification ═══════ */}
                        <div className="bg-card rounded-xl border border-border p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <FileCheck className="text-primary" size={16} />
                                <h2 className="text-xs font-bold text-foreground">Insurance Claim Verification</h2>
                            </div>
                            <p className="text-[10px] text-muted-foreground mb-4">
                                Verify medical claims using ZKP — proves a condition occurred without revealing raw patient data.
                            </p>

                            <div className="flex gap-3 mb-4">
                                <select
                                    value={claimType}
                                    onChange={e => setClaimType(e.target.value)}
                                    className="flex-1 bg-background border border-border rounded-lg px-3 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                                >
                                    <option value="HYPOXIA">HYPOXIA — SpO2 below 90%</option>
                                    <option value="MILD_HYPOXIA">MILD HYPOXIA — SpO2 below 95%</option>
                                    <option value="FEVER">FEVER — Temperature above 100.4°F</option>
                                    <option value="TACHYCARDIA">TACHYCARDIA — Heart rate above 100 BPM</option>
                                    <option value="BRADYCARDIA">BRADYCARDIA — Heart rate below 60 BPM</option>
                                    <option value="AIR_HAZARD">AIR HAZARD — Air quality above 1000 PPM</option>
                                </select>
                                <button
                                    onClick={handleVerifyClaim}
                                    disabled={claimLoading}
                                    className="px-5 py-2.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                                >
                                    {claimLoading ? 'Verifying...' : 'Verify Claim'}
                                </button>
                            </div>

                            {claimResult && !claimResult.error && (
                                <div className={`rounded-lg border p-4 ${claimResult.verified ? 'bg-accent/5 border-accent/20' : 'bg-destructive/5 border-destructive/20'
                                    }`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-semibold text-foreground">
                                            {claimResult.claim_type}: {claimResult.verified ? 'VERIFIED ✓' : 'NOT VERIFIED ✗'}
                                        </p>
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${claimResult.verified ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'
                                            }`}>
                                            {claimResult.verified ? 'Claim Valid' : 'Claim Invalid'}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mb-2">{claimResult.claim_description}</p>
                                    {claimResult.cardano_tx_id && (
                                        <a href={claimResult.cardano_verify_url} target="_blank" rel="noopener noreferrer"
                                            className="text-[10px] font-mono text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                                            Cardano Tx: {claimResult.cardano_tx_id.slice(0, 24)}... <ExternalLink size={10} />
                                        </a>
                                    )}
                                    <p className="text-[9px] font-mono text-muted-foreground mt-2">Proof Hash: {claimResult.proof_hash}</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-muted-foreground px-1">
                            <span>ZKP Engine: 3 circuits · Privacy-preserving · No raw values accessible</span>
                            <span className="font-mono">VitalsIQ v2.0 — Doctor ZKP Dashboard</span>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
