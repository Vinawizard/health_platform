'use client';
import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

const DEFAULT_WALLET = 'addr_test1vzasxjyws8a0n7xuq0ycmcvzqdf32dqsv7vrkljlkege8fc5m82m7';

const ConnectWalletList = dynamic(
    () =>
        import('@cardano-foundation/cardano-connect-with-wallet').then(
            (mod) => mod.ConnectWalletList
        ),
    { ssr: false }
);

export function useWallet() {
    const [address, setAddress] = useState(null);
    const [walletName, setWalletName] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isDemo, setIsDemo] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('wallet_address');
        const savedName = localStorage.getItem('wallet_name');
        const savedDemo = localStorage.getItem('wallet_is_demo');
        if (saved) {
            setAddress(saved);
            setWalletName(savedName || 'demo');
            setIsConnected(true);
            setIsDemo(savedDemo === 'true');
        }
    }, []);

    const connectDemo = useCallback(() => {
        setAddress(DEFAULT_WALLET);
        setWalletName('Demo (Preprod)');
        setIsConnected(true);
        setIsDemo(true);
        localStorage.setItem('wallet_address', DEFAULT_WALLET);
        localStorage.setItem('wallet_name', 'Demo (Preprod)');
        localStorage.setItem('wallet_is_demo', 'true');
    }, []);

    const onCIP30Connect = useCallback((walletNameStr, addr) => {
        setAddress(addr);
        setWalletName(walletNameStr);
        setIsConnected(true);
        setIsDemo(false);
        localStorage.setItem('wallet_address', addr);
        localStorage.setItem('wallet_name', walletNameStr);
        localStorage.setItem('wallet_is_demo', 'false');
    }, []);

    const disconnect = useCallback(() => {
        setAddress(null);
        setWalletName(null);
        setIsConnected(false);
        setIsDemo(false);
        localStorage.removeItem('wallet_address');
        localStorage.removeItem('wallet_name');
        localStorage.removeItem('wallet_is_demo');
    }, []);

    return { address, walletName, isConnected, isDemo, connectDemo, onCIP30Connect, disconnect };
}

export function WalletConnector({ address, walletName, isConnected, isDemo, connectDemo, onCIP30Connect, disconnect, compact }) {
    const [showPicker, setShowPicker] = useState(false);

    // Compact mode — disconnected: show small inline buttons
    if (!isConnected && compact) {
        return (
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setShowPicker(true)}
                    className="text-[11px] font-semibold text-primary-foreground bg-primary px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors"
                >
                    Connect Wallet
                </button>
                <button
                    onClick={connectDemo}
                    className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-md border border-border hover:bg-secondary transition-colors"
                >
                    Demo
                </button>
                {showPicker && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm" onClick={() => setShowPicker(false)}>
                        <div className="bg-card rounded-xl border border-border p-5 max-w-sm w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
                            <h3 className="text-sm font-bold text-foreground mb-1">Select a Wallet</h3>
                            <p className="text-[10px] text-muted-foreground mb-4">Choose a CIP-30 compatible wallet</p>
                            <ConnectWalletList
                                onConnect={(name) => { onCIP30Connect(name); setShowPicker(false); }}
                                dAppName="VitalsIQ"
                                dAppUrl={typeof window !== 'undefined' ? window.location.origin : ''}
                            />
                            <button onClick={() => setShowPicker(false)} className="mt-3 w-full text-xs text-muted-foreground py-2 hover:text-foreground transition-colors">Cancel</button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Compact mode — connected
    if (isConnected && compact) {
        return (
            <div className="flex items-center gap-2">
                <a
                    href={`https://preprod.cardanoscan.io/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-mono text-primary/80 hover:text-primary bg-primary/5 px-2 py-1 rounded-md transition-colors"
                    title={address}
                >
                    {address.slice(0, 10)}...{address.slice(-6)}
                </a>
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-accent/10 text-accent">
                    {isDemo ? 'Demo' : walletName}
                </span>
                <button
                    onClick={disconnect}
                    className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-secondary transition-colors"
                >
                    Disconnect
                </button>
            </div>
        );
    }

    if (isConnected) {
        return (
            <div className="bg-card rounded-xl border border-border p-5 max-w-md w-full">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground">
                        {isDemo ? 'Demo Wallet Connected' : `Connected via ${walletName}`}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent">Active</span>
                </div>
                <div className="font-mono text-[11px] text-primary/80 bg-primary/5 rounded-lg p-3 break-all mb-3">
                    {address}
                </div>
                <div className="flex gap-2">
                    <a
                        href={`https://preprod.cardanoscan.io/address/${address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-primary hover:text-primary/80 bg-primary/5 px-3 py-1.5 rounded-md transition-colors"
                    >
                        View on Cardanoscan
                    </a>
                    <button
                        onClick={disconnect}
                        className="text-[11px] text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
                    >
                        Disconnect
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-md w-full">
            {!showPicker ? (
                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => setShowPicker(true)}
                        className="w-full py-3.5 px-6 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                    >
                        Connect Wallet
                    </button>
                    <button
                        onClick={connectDemo}
                        className="w-full py-3 px-6 bg-card border border-border text-foreground text-sm font-medium rounded-xl hover:bg-card-hover hover:border-primary/30 transition-colors"
                    >
                        Use Demo Wallet (Preprod Testnet)
                    </button>
                </div>
            ) : (
                <div className="bg-card rounded-xl border border-border p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-foreground">Select a Wallet</h3>
                        <button
                            onClick={() => setShowPicker(false)}
                            className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-secondary transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-4">
                        CIP-30 compatible: Nami, Lace, Eternl, Flint, Typhon
                    </p>
                    <ConnectWalletList
                        borderRadius={8}
                        gap={10}
                        primaryColor="#3b82f6"
                        onConnect={(name, addr) => {
                            onCIP30Connect(name, addr);
                            setShowPicker(false);
                        }}
                        customCSS={`
              font-family: 'Inter', sans-serif;
              font-size: 13px;
              font-weight: 600;
              width: 100%;
              & > span {
                padding: 10px 14px;
                background: #111827;
                border: 1px solid #1e293b;
                border-radius: 8px;
                color: #f1f5f9;
                transition: all 0.2s ease;
              }
              & > span:hover {
                border-color: rgba(59, 130, 246, 0.3);
                background: #1a2035;
              }
            `}
                    />
                    <div className="mt-4 pt-4 border-t border-border">
                        <button
                            onClick={() => { connectDemo(); setShowPicker(false); }}
                            className="w-full py-2.5 text-xs font-medium text-muted-foreground bg-secondary rounded-lg hover:text-foreground hover:bg-secondary/80 transition-colors"
                        >
                            No wallet? Use Demo Wallet
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
