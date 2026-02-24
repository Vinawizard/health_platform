'use client';
import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

const DEFAULT_WALLET = 'addr_test1vzasxjyws8a0n7xuq0ycmcvzqdf32dqsv7vrkljlkege8fc5m82m7';

// Dynamic import for SSR safety — this library accesses `window`
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

    if (isConnected && compact) {
        return (
            <div className="wallet" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <a
                    href={`https://preprod.cardanoscan.io/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="wallet-address"
                    style={{ textDecoration: 'none' }}
                    title={address}
                >
                    {address.slice(0, 12)}...{address.slice(-8)}
                </a>
                <div className="badge badge-verified" style={{ gap: '4px' }}>
                    <div className="dot dot-green" style={{ width: '6px', height: '6px' }}></div>
                    {isDemo ? 'Demo' : walletName}
                </div>
                <button
                    className="btn btn-secondary"
                    onClick={disconnect}
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                    Disconnect
                </button>
            </div>
        );
    }

    if (isConnected) {
        return (
            <div className="card" style={{ maxWidth: '500px', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        Wallet Connected {isDemo ? '(Demo Mode)' : `via ${walletName}`}
                    </span>
                    <div className="badge badge-verified">
                        <div className="dot dot-green" style={{ width: '6px', height: '6px' }}></div>
                        Active
                    </div>
                </div>
                <div className="wallet-address" style={{ width: '100%', wordBreak: 'break-all', fontSize: '12px', marginBottom: '12px' }}>
                    {address}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <a
                        href={`https://preprod.cardanoscan.io/address/${address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="chain-link"
                        style={{ fontSize: '11px' }}
                    >
                        View on Cardanoscan
                    </a>
                    <button
                        className="btn btn-secondary"
                        onClick={disconnect}
                        style={{ padding: '4px 12px', fontSize: '12px' }}
                    >
                        Disconnect
                    </button>
                </div>
            </div>
        );
    }

    // Not connected
    return (
        <div style={{ maxWidth: '500px', width: '100%' }}>
            {!showPicker ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowPicker(true)}
                        style={{ width: '100%', justifyContent: 'center', padding: '16px 24px', fontSize: '16px' }}
                    >
                        Connect Wallet
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={connectDemo}
                        style={{ width: '100%', justifyContent: 'center', padding: '12px 24px', fontSize: '14px' }}
                    >
                        Use Demo Wallet (Preprod Testnet)
                    </button>
                </div>
            ) : (
                <div className="card" style={{ textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Select a Wallet</h3>
                        <button
                            className="btn btn-secondary"
                            onClick={() => setShowPicker(false)}
                            style={{ padding: '4px 12px', fontSize: '12px' }}
                        >
                            Cancel
                        </button>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                        Connect a CIP-30 compatible Cardano wallet (Nami, Lace, Eternl, Flint, etc.)
                    </p>
                    <ConnectWalletList
                        borderRadius={8}
                        gap={12}
                        primaryColor="#3b82f6"
                        onConnect={(walletName, addr) => {
                            onCIP30Connect(walletName, addr);
                            setShowPicker(false);
                        }}
                        customCSS={`
              font-family: 'Inter', sans-serif;
              font-size: 14px;
              font-weight: 600;
              width: 100%;
              & > span {
                padding: 12px 16px;
                background: var(--bg-secondary);
                border: 1px solid var(--border);
                border-radius: 8px;
                color: var(--text-primary);
                transition: all 0.2s ease;
              }
              & > span:hover {
                border-color: var(--accent-blue);
                background: var(--bg-card-hover);
              }
            `}
                    />
                    <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={() => {
                                connectDemo();
                                setShowPicker(false);
                            }}
                            style={{ width: '100%', justifyContent: 'center', fontSize: '13px' }}
                        >
                            No wallet? Use Demo Wallet (Preprod Testnet)
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
