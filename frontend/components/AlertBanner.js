'use client';
import { AlertTriangle } from 'lucide-react';

export default function AlertBanner({ alerts }) {
    if (!alerts || alerts.length === 0) return null;

    return (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 flex items-start gap-3">
            <div className="p-1 bg-destructive/20 rounded-md mt-0.5">
                <AlertTriangle className="text-destructive" size={14} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-destructive mb-1">
                    Clinical Alert — {alerts.length} {alerts.length === 1 ? 'issue' : 'issues'} detected
                </p>
                <ul className="space-y-0.5">
                    {alerts.map((alert, i) => (
                        <li key={i} className="text-[11px] text-destructive/80">{alert}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
