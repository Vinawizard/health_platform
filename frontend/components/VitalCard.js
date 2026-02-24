'use client';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export default function VitalCard({ icon, label, value, unit, status, statusLabel, subtitle }) {
    return (
        <div className={cn(
            'group relative bg-card rounded-xl border border-border p-4 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5',
            status === 'critical' && 'border-destructive/30 animate-breathe'
        )}>
            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        'p-1.5 rounded-lg',
                        status === 'critical' ? 'bg-destructive/10' : 'bg-primary/10'
                    )}>
                        {icon}
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
                </div>
                <span className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                    status === 'critical' && 'bg-destructive/10 text-destructive',
                    status === 'warning' && 'bg-warning/10 text-warning',
                    status === 'normal' && 'bg-accent/10 text-accent',
                )}>
                    {statusLabel}
                </span>
            </div>

            {/* Value row */}
            <div className="flex items-baseline gap-1.5">
                <span className={cn(
                    'text-3xl font-bold tabular-nums tracking-tight',
                    status === 'critical' ? 'text-destructive' : 'text-foreground'
                )}>
                    {value}
                </span>
                <span className="text-xs text-muted-foreground font-medium">{unit}</span>
            </div>

            {/* Subtitle */}
            {subtitle && (
                <p className="text-[10px] text-muted-foreground mt-2">{subtitle}</p>
            )}

            {/* Bottom accent bar */}
            <div className={cn(
                'absolute bottom-0 left-3 right-3 h-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity',
                status === 'critical' ? 'bg-destructive' : status === 'warning' ? 'bg-warning' : 'bg-primary'
            )} />
        </div>
    );
}
