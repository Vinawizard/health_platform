'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    fetchLatestProofs,
    fetchHealthCertificate,
    verifyClaim,
    fetchComplianceReport,
} from '../../lib/api';

export default function DoctorDashboard() {
    const [proofs, setProofs] = useState(null);
    const [certificate, setCertificate] = useState(null);
    const [compliance, setCompliance] = useState(null);
    const [claimType, setClaimType] = useState('HYPOXIA');
    const [claimResult, setClaimResult] = useState(null);
    const [claimLoading, setClaimLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [prfs, cert, comp] = await Promise.all([
                fetchLatestProofs(),
                fetchHealthCertificate(),
                fetchComplianceReport('spo2_percent', 50),
            ]);
            setProofs(prfs);
            setCertificate(cert);
            setCompliance(comp);
            setLoading(false);
        } catch (e) {
            setError(e.message);
            setLoading(false);
        }
    }

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

    if (loading) {
        return (
            <div className="dashboard container">
                <div className="loading"><div className="pulse-dot"></div> Loading ZKP proofs...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard container">
                <div className="loading" style={{ color: 'var(--accent-red)' }}>
                    Cannot connect to backend. Make sure the server is running on localhost:8000
                </div>
            </div>
        );
    }

    const cert = certificate?.certificate;
    const vitalProofs = proofs?.proofs?.filter(p => p.circuit === 'vital_range_check') || [];
    const claimProofs = proofs?.proofs?.filter(p => p.circuit === 'insurance_claim_proof') || [];
    const compReport = compliance?.report;

    return (
        <div className="dashboard container">
            <div className="dash-header">
                <div>
                    <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '13px' }}>
                        &larr; Back
                    </Link>
                    <h1 style={{ marginTop: '8px' }}>Doctor Dashboard</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                        Zero-knowledge view — raw vitals are hidden
                    </p>
                </div>
                <div className="badge badge-verified">ZKP Verified Access</div>
            </div>

            {/* Notice */}
            <div className="chain-bar">
                <div className="chain-item">
                    <div className="dot dot-yellow"></div>
                    <span>You are viewing ZKP proofs only. No raw medical values are visible on this dashboard.</span>
                </div>
            </div>

            {/* Health Certificate */}
            {cert && (
                <>
                    <div className="section-header">
                        <h2>Health Certificate</h2>
                        <span className="badge badge-verified">Proof Hash: {cert.proof_hash?.slice(0, 12)}...</span>
                    </div>

                    <div className="cert-card">
                        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Overall Health Grade</div>
                        <div className={`cert-grade grade-${cert.grade?.toLowerCase()}`}>
                            {cert.grade}
                        </div>
                        <div className="cert-score">{cert.score} vitals in normal range</div>

                        <div className="cert-vitals">
                            {cert.vitals && Object.entries(cert.vitals).map(([key, v]) => (
                                <div className="cert-vital-item" key={key}>
                                    <div className="vital-name">{v.label}</div>
                                    <div className={`badge badge-${v.status?.toLowerCase()}`} style={{ marginTop: '4px' }}>
                                        {v.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Per-Vital ZKP Status */}
            <div className="section-header">
                <h2>Vital Status (ZKP)</h2>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    {vitalProofs.length} proofs verified
                </span>
            </div>

            {vitalProofs.map((proof, i) => (
                <div className="proof-card" key={i}>
                    <div className="proof-left">
                        <h3>{proof.label}</h3>
                        <div className="proof-detail">
                            Normal range: {proof.normal_range} | Proof: {proof.proof_hash?.slice(0, 16)}...
                        </div>
                    </div>
                    <div className="proof-right">
                        <div className={`badge badge-${proof.status?.toLowerCase()}`}>
                            {proof.status}
                        </div>
                    </div>
                </div>
            ))}

            {/* Auto-Detected Events */}
            {claimProofs.length > 0 && (
                <>
                    <div className="section-header" style={{ marginTop: '32px' }}>
                        <h2>Auto-Detected Events</h2>
                        <span className="badge badge-critical">{claimProofs.length} events</span>
                    </div>

                    {claimProofs.map((proof, i) => (
                        <div className="proof-card" key={i}>
                            <div className="proof-left">
                                <h3>{proof.claim_type}</h3>
                                <div className="proof-detail">{proof.claim_description}</div>
                            </div>
                            <div className="proof-right">
                                <div className={`badge ${proof.verified ? 'badge-critical' : 'badge-normal'}`}>
                                    {proof.verified ? 'Event Confirmed' : 'Not Detected'}
                                </div>
                                {proof.cardano_tx_id && (
                                    <a
                                        href={proof.cardano_verify_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="chain-link"
                                    >
                                        On-Chain
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </>
            )}

            {/* Compliance Report */}
            {compReport && (
                <>
                    <div className="section-header" style={{ marginTop: '32px' }}>
                        <h2>Compliance Report — {compReport.label}</h2>
                    </div>

                    <div className="card" style={{ marginBottom: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div>
                                <span style={{ fontSize: '32px', fontWeight: 700 }}>{compReport.compliance_percent}%</span>
                                <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>compliance</span>
                            </div>
                            <div className={`badge ${compReport.status === 'COMPLIANT' ? 'badge-normal' : 'badge-critical'}`}>
                                {compReport.status}
                            </div>
                        </div>

                        <div className="compliance-bar">
                            <div
                                className="compliance-fill"
                                style={{
                                    width: `${compReport.compliance_percent}%`,
                                    background: compReport.compliance_percent >= 90
                                        ? 'var(--gradient-green)'
                                        : compReport.compliance_percent >= 70
                                            ? 'var(--gradient-red)'
                                            : 'var(--accent-red)',
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '24px', marginTop: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            <span>Safe: <strong style={{ color: 'var(--accent-green)' }}>{compReport.safe_readings}</strong></span>
                            <span>Warning: <strong style={{ color: 'var(--accent-yellow)' }}>{compReport.warning_readings}</strong></span>
                            <span>Critical: <strong style={{ color: 'var(--accent-red)' }}>{compReport.critical_readings}</strong></span>
                            <span>Total: <strong>{compReport.total_readings}</strong></span>
                        </div>
                    </div>
                </>
            )}

            {/* Insurance Claim Verification */}
            <div className="section-header" style={{ marginTop: '32px' }}>
                <h2>Insurance Claim Verification</h2>
            </div>

            <div className="claim-section">
                <div className="claim-form">
                    <select value={claimType} onChange={e => setClaimType(e.target.value)}>
                        <option value="HYPOXIA">HYPOXIA — SpO2 below 90%</option>
                        <option value="MILD_HYPOXIA">MILD HYPOXIA — SpO2 below 95%</option>
                        <option value="FEVER">FEVER — Temperature above 100.4°F</option>
                        <option value="TACHYCARDIA">TACHYCARDIA — Heart rate above 100 BPM</option>
                        <option value="BRADYCARDIA">BRADYCARDIA — Heart rate below 60 BPM</option>
                        <option value="AIR_HAZARD">AIR HAZARD — Air quality above 1000 PPM</option>
                    </select>
                    <button className="btn btn-primary" onClick={handleVerifyClaim} disabled={claimLoading}>
                        {claimLoading ? 'Verifying...' : 'Verify Claim'}
                    </button>
                </div>

                {claimResult && !claimResult.error && (
                    <div className={`claim-result ${claimResult.verified ? 'verified' : 'not-verified'}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>
                                    {claimResult.claim_type}: {claimResult.verified ? 'VERIFIED' : 'NOT VERIFIED'}
                                </h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                    {claimResult.claim_description}
                                </p>
                            </div>
                            <div className={`badge ${claimResult.verified ? 'badge-normal' : 'badge-critical'}`}>
                                {claimResult.verified ? 'Claim Valid' : 'Claim Invalid'}
                            </div>
                        </div>
                        {claimResult.cardano_tx_id && (
                            <div style={{ marginTop: '12px' }}>
                                <a
                                    href={claimResult.cardano_verify_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="chain-link"
                                >
                                    Verify on Cardano: {claimResult.cardano_tx_id.slice(0, 20)}...
                                </a>
                            </div>
                        )}
                        <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                            Proof Hash: {claimResult.proof_hash}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
