'use client';
import Link from 'next/link';
import { Activity, Heart, Shield, ArrowRight } from 'lucide-react';
import { useWallet, WalletConnector } from '../components/WalletConnector';

export default function Home() {
  const wallet = useWallet();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="text-center mb-10 relative z-10">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <Activity className="text-primary" size={28} />
          </div>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-3">
          VitalsIQ
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          Privacy-first IoT health monitoring powered by AES-256-GCM encryption,
          Cardano blockchain anchoring, and zero-knowledge proofs.
        </p>
      </div>

      {/* Wallet */}
      <div className="mb-10 w-full flex justify-center relative z-10">
        <WalletConnector {...wallet} />
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-xl w-full relative z-10">
        <Link
          href="/patient"
          className="group bg-card border border-border rounded-xl p-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Heart className="text-primary" size={20} />
            </div>
            <ArrowRight className="text-muted-foreground group-hover:text-primary transition-colors" size={16} />
          </div>
          <h2 className="text-base font-bold text-foreground mb-1.5">Patient</h2>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Live sensor readings, encryption status, blockchain anchoring, and access management.
          </p>
        </Link>

        <Link
          href="/doctor"
          className="group bg-card border border-border rounded-xl p-6 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Shield className="text-accent" size={20} />
            </div>
            <ArrowRight className="text-muted-foreground group-hover:text-accent transition-colors" size={16} />
          </div>
          <h2 className="text-base font-bold text-foreground mb-1.5">Doctor</h2>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Zero-knowledge proofs only. Health status without raw medical data. On-chain verification.
          </p>
        </Link>
      </div>

      {/* Status bar */}
      <div className="mt-10 flex items-center gap-4 bg-card/50 border border-border rounded-lg px-4 py-2.5 text-[10px] text-muted-foreground relative z-10">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-accent" />
          Cardano Preprod
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          AES-256-GCM
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-warning" />
          ZKP Engine
        </div>
      </div>
    </div>
  );
}
