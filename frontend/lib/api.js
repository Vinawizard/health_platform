const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchLatestData() {
    const res = await fetch(`${API_BASE}/latest-data`);
    if (!res.ok) throw new Error('Failed to fetch latest data');
    return res.json();
}

export async function fetchHistory() {
    const res = await fetch(`${API_BASE}/history`);
    if (!res.ok) throw new Error('Failed to fetch history');
    return res.json();
}

export async function fetchLatestProofs() {
    const res = await fetch(`${API_BASE}/proofs/latest`);
    if (!res.ok) throw new Error('Failed to fetch proofs');
    return res.json();
}

export async function fetchHealthCertificate() {
    const res = await fetch(`${API_BASE}/proofs/health-certificate`);
    if (!res.ok) throw new Error('Failed to fetch certificate');
    return res.json();
}

export async function verifyClaim(claimType) {
    const res = await fetch(`${API_BASE}/proofs/verify-claim?claim_type=${claimType}`, {
        method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to verify claim');
    return res.json();
}

export async function fetchComplianceReport(vital, count = 50) {
    const res = await fetch(`${API_BASE}/proofs/compliance-report?vital=${vital}&readings_count=${count}`);
    if (!res.ok) throw new Error('Failed to fetch compliance');
    return res.json();
}

export async function fetchAvailableClaims() {
    const res = await fetch(`${API_BASE}/proofs/available-claims`);
    if (!res.ok) throw new Error('Failed to fetch claims');
    return res.json();
}

export async function verifyRealZKP(circuit, proof, publicSignals) {
    const res = await fetch(`${API_BASE}/proofs/verify-zkp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ circuit, proof, publicSignals })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Verification failed');
    }
    return res.json();
}
