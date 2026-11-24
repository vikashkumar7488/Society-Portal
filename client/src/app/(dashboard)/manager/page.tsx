'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, CreditCard, MessageSquare, Settings, ClipboardList, ArrowRight, ShieldCheck } from 'lucide-react';

const sections = [
  { title: 'Manage Residents', description: 'View and manage resident accounts and flat details.', href: '/admin/users', icon: Users, action: 'Open residents' },
  { title: 'Maintenance & Payments', description: 'Review society maintenance records and verify manual payments.', href: '/admin/payments', icon: CreditCard, action: 'Review payments' },
  { title: 'Complaints', description: 'Review complaints submitted by residents and manage their status.', href: '/admin/complaints', icon: MessageSquare, action: 'Manage complaints' },
  { title: 'Society Assets', description: 'Manage and monitor shared society assets.', href: '/admin/assets', icon: Settings, action: 'Manage assets' },
  { title: 'Emergency & Operations', description: 'Monitor active emergencies and society operations.', href: '/emergency', icon: ClipboardList, action: 'Open operations' },
];

export default function ManagerDashboard() {
  const { user } = useAuth();
  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-blue-900 p-6 md:p-8 text-white shadow-sm">
        <div className="flex items-center gap-3 mb-3"><ShieldCheck className="h-7 w-7 text-blue-300" /><span className="text-sm font-semibold tracking-wide text-blue-200">MANAGEMENT PORTAL</span></div>
        <h1 className="text-2xl md:text-3xl font-bold">Welcome, {user?.name?.split(' ')[0] || 'Manager'}</h1>
        <p className="mt-2 text-slate-300">Manage society operations from one place. Resident-only personal services are not shown here.</p>
      </div>
      <div><h2 className="text-xl font-bold text-slate-900">Manager Workspace</h2><p className="text-sm text-slate-500 mt-1">Choose the management task you need to perform.</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {sections.map((section) => { const Icon = section.icon; return (
          <Card key={section.href} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader><div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-2"><Icon className="h-5 w-5" /></div><CardTitle className="text-lg">{section.title}</CardTitle><CardDescription>{section.description}</CardDescription></CardHeader>
            <CardContent><Button asChild className="w-full"><Link href={section.href}>{section.action}<ArrowRight className="h-4 w-4 ml-2" /></Link></Button></CardContent>
          </Card>
        ); })}
      </div>
    </div>
  );
}
