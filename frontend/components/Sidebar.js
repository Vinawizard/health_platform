'use client';
import { Activity, LayoutDashboard, Users, Shield, FileText, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/patient', active: true },
    { icon: Shield, label: 'ZKP Proofs', href: '/doctor' },
    { icon: Users, label: 'Access', href: '/patient' },
    { icon: FileText, label: 'Reports', href: '/doctor' },
    { icon: Settings, label: 'Settings', href: '/' },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="hidden lg:flex w-[220px] flex-col bg-card border-r border-border h-screen sticky top-0">
            <div className="p-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Activity className="text-primary" size={16} />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold tracking-tight text-foreground">VitalsIQ</h1>
                        <p className="text-[10px] text-muted-foreground">IoT Health Platform</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-3 py-4">
                <ul className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <li key={item.label}>
                                <Link
                                    href={item.href}
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${isActive
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                        }`}
                                >
                                    <item.icon size={16} />
                                    {item.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="p-3 border-t border-border">
                <div className="flex items-center gap-2.5 px-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        DR
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">Dr. Clinician</p>
                        <p className="text-[10px] text-muted-foreground">ICU Ward 3</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
