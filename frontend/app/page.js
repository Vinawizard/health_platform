'use client';
import Link from 'next/link';
import { useWallet, WalletConnector } from '../components/WalletConnector';

export default function Home() {
  const wallet = useWallet();

  return (
    <div className="landing">
      <h1>Health Platform</h1>
      <p className="subtitle">
        Privacy-first IoT health monitoring powered by AES-256-GCM encryption,
        Cardano blockchain anchoring, and zero-knowledge proofs.
        Your vitals, your control.
      </p>

      {/* Wallet Connection */}
      <div style={{ marginBottom: '40px', width: '100%', maxWidth: '500px', display: 'flex', justifyContent: 'center' }}>
        <WalletConnector {...wallet} />
      </div>

      <div className="role-cards">
        <Link href="/patient" className="role-card">
          <span className="icon">&#9829;</span>
          <h2>Patient</h2>
          <p>
            View your live sensor readings, encryption status, and blockchain
            anchoring. Manage doctor access to your data.
          </p>
        </Link>

        <Link href="/doctor" className="role-card">
          <span className="icon">&#9878;</span>
          <h2>Doctor</h2>
          <p>
            View zero-knowledge proofs only. See health status without
            seeing raw medical data. Verify claims on-chain.
          </p>
        </Link>
      </div>

      <div style={{ marginTop: '48px', display: 'flex', gap: '24px', alignItems: 'center' }}>
        <div className="chain-bar" style={{ margin: 0 }}>
          <div className="chain-item">
            <div className="dot dot-green"></div>
            <span>Cardano Preprod</span>
          </div>
          <div className="chain-item">
            <div className="dot dot-blue"></div>
            <span>AES-256-GCM</span>
          </div>
          <div className="chain-item">
            <div className="dot dot-yellow"></div>
            <span>ZKP Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}
