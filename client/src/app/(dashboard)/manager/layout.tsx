'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const allowed = !!user && ['manager', 'admin'].includes(user.role);

  useEffect(() => {
    if (!loading && !allowed) router.replace('/');
  }, [loading, allowed, router]);

  if (loading || !allowed) {
    return <div className="min-h-[40vh] flex items-center justify-center text-slate-500">Checking manager access...</div>;
  }
  return <>{children}</>;
}
