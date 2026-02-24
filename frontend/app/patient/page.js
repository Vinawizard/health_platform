'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchLatestData, fetchHistory } from '../../lib/api';
import { useWallet, WalletConnector } from '../../components/WalletConnector';

export default function PatientDashboard() {
    const [data, setData] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const wallet = useWallet();

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 5000);
        return () => clearInterval(interval);
    }, []);

    async function loadData() {
        try {
            const [latest, hist] = await Promise.all([fetchLatestData(), fetchHistory()]);
            setData(latest);
            setHistory(hist);
            setLoading(false);
        } catch (e) {
            setError(e.message);
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="dashboard container">
                <div className="loading"><div className="pulse-dot"></div> Loading sensor data...</div>
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

    const vitals = [
        {
            name: 'Body Temperature',
            value: data?.temperature_f,
            unit: '°F',
            range: '97.0 – 99.5',
            status: getStatus(data?.temperature_f, 97, 99.5),
        },
        {
            name: 'Heart Rate',
            value: data?.pulse_bpm,
            unit: 'BPM',
            range: '60 – 100',
            status: getStatus(data?.pulse_bpm, 60, 100),
        },
        {
            name: 'Blood Oxygen (SpO2)',
            value: data?.spo2_percent,
            unit: '%',
            range: '95 – 100',
            status: getStatus(data?.spo2_percent, 95, 100),
        },
        {
            name: 'Air Quality',
            value: data?.air_quality_ppm,
            unit: 'PPM',
            range: '0 – 400',
            status: data?.air_quality_ppm <= 400 ? 'NORMAL' : data?.air_quality_ppm <= 1000 ? 'WARNING' : 'CRITICAL',
        },
    ];

    const anchoredCount = history.filter(r => r.anchored).length;

    return (
        <div className="dashboard container">
            <div className="dash-header">
                <div>
                    <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '13px' }}>
                        &larr; Back
                    </Link>
                    <h1 style={{ marginTop: '8px' }}>Patient Dashboard</h1>
                </div>
                <WalletConnector {...wallet} compact />
            </div>

            {/* Connect wallet prompt if not connected */}
            {!wallet.isConnected && (
                <div className="chain-bar" style={{ flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Connect your wallet to access your health data</span>
                    <WalletConnector {...wallet} />
                </div>
            )}

            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="label">Total Readings</div>
                    <div className="value">{history.length}</div>
                    <div className="sub">stored encrypted</div>
                </div>
                <div className="stat-card">
                    <div className="label">On-Chain</div>
                    <div className="value" style={{ color: 'var(--accent-green)' }}>{anchoredCount}</div>
                    <div className="sub">anchored on Cardano</div>
                </div>
                <div className="stat-card">
                    <div className="label">Encryption</div>
                    <div className="value" style={{ color: 'var(--accent-cyan)', fontSize: '18px' }}>AES-256-GCM</div>
                    <div className="sub">envelope encryption</div>
                </div>
                <div className="stat-card">
                    <div className="label">Network</div>
                    <div className="value" style={{ color: 'var(--accent-purple)', fontSize: '18px' }}>Preprod</div>
                    <div className="sub">Cardano testnet</div>
                </div>
            </div>

            {/* Chain info */}
            {data?.cardano_tx_id && (
                <div className="chain-bar">
                    <div className="chain-item">
                        <div className="dot dot-green"></div>
                        <span>Latest Tx:</span>
                    </div>
                    <a
                        href={`https://preprod.cardanoscan.io/transaction/${data.cardano_tx_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="chain-link"
                    >
                        {data.cardano_tx_id.slice(0, 16)}...{data.cardano_tx_id.slice(-8)}
                    </a>
                    <div className="chain-item">
                        <div className="dot dot-blue"></div>
                        <span>Hash: {data.hash?.slice(0, 12)}...</span>
                    </div>
                </div>
            )}

            {/* Live Vitals */}
            <div className="section-header">
                <h2>Live Sensor Readings</h2>
                <div className="badge badge-verified">
                    <div className="pulse-dot" style={{ marginRight: 0 }}></div>
                    Auto-refresh 5s
                </div>
            </div>

            <div className="vitals-grid">
                {vitals.map((v, i) => (
                    <div className="vital-card" key={i}>
                        <div className="vital-info">
                            <h3>{v.name}</h3>
                            <div className="reading">
                                {v.value != null ? v.value : '—'}
                                <span className="unit"> {v.unit}</span>
                            </div>
                            <div className="range">Normal: {v.range} {v.unit}</div>
                        </div>
                        <div className={`badge badge-${v.status?.toLowerCase()}`}>
                            {v.status}
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Activity */}
            <div className="section-header">
                <h2>Recent Readings</h2>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '13px',
                }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <th style={thStyle}>Time</th>
                            <th style={thStyle}>Temp</th>
                            <th style={thStyle}>BPM</th>
                            <th style={thStyle}>SpO2</th>
                            <th style={thStyle}>Air</th>
                            <th style={thStyle}>Anchored</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.slice(0, 10).map((r, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={tdStyle}>{formatTime(r.timestamp)}</td>
                                <td style={tdStyle}>{r.temperature_f ?? '—'}</td>
                                <td style={tdStyle}>{r.pulse_bpm ?? '—'}</td>
                                <td style={tdStyle}>{r.spo2_percent ?? '—'}</td>
                                <td style={tdStyle}>{r.air_quality_ppm ?? '—'}</td>
                                <td style={tdStyle}>
                                    {r.anchored ? (
                                        <a
                                            href={`https://preprod.cardanoscan.io/transaction/${r.cardano_tx_id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="chain-link"
                                        >
                                            Verified
                                        </a>
                                    ) : (
                                        <span style={{ color: 'var(--text-muted)' }}>Pending</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function getStatus(value, low, high) {
    if (value == null) return 'NO_DATA';
    if (value >= low && value <= high) return 'NORMAL';
    return 'WARNING';
}

function formatTime(ts) {
    if (!ts) return '—';
    try {
        const d = new Date(ts);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
        return ts;
    }
}

const thStyle = {
    textAlign: 'left',
    padding: '12px 16px',
    color: 'var(--text-muted)',
    fontWeight: 600,
    textTransform: 'uppercase',
    fontSize: '11px',
    letterSpacing: '0.5px',
};

const tdStyle = {
    padding: '12px 16px',
    color: 'var(--text-secondary)',
};
