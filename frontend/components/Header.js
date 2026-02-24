'use client';
import { Activity, Bell, Menu } from 'lucide-react';
import { useWallet, WalletConnector } from './WalletConnector';

export default function Header({ connected, alertCount, onMenuToggle }) {
    const wallet = useWallet();

    return (
        <header className="flex items-center justify-between px-4 lg:px-6 py-3 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuToggle}
                    className="lg:hidden p-2 rounded-md text-muted-foreground hover:bg-secondary"
                >
                    <Menu size={18} />
                </button>
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${connected ? 'bg-accent animate-pulse' : 'bg-destructive'}`} />
                    <span className="text-xs font-medium text-muted-foreground">
                        {connected ? 'Live Monitoring' : 'Disconnected'}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* Wallet Connect */}
                <WalletConnector {...wallet} compact />

                {/* Notifications */}
                <button
                    className="relative p-2 rounded-md text-muted-foreground hover:bg-secondary"
                    title={`Notifications: ${alertCount} alerts`}
                >
                    <Bell size={16} />
                    {alertCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                            {alertCount}
                        </span>
                    )}
                </button>
            </div>
        </header>
    );
}
