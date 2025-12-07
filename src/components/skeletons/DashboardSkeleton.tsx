// src/components/skeletons/DashboardSkeleton.tsx

import { Skeleton, CardSkeleton } from '../Skeleton';

export function DashboardSkeleton() {
  return (
    <div 
      className="min-h-screen bg-slate-50 pb-20"
      role="status" 
      aria-label="Loading dashboard content"
    >
      <span className="sr-only">Loading dashboard...</span>
      
      {/* Nav */}
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-24 hidden sm:block" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        {/* Banner */}
        <div className="rounded-2xl p-8 bg-slate-200 h-64 animate-pulse relative overflow-hidden">
          <div className="absolute bottom-8 left-8 space-y-4">
            <Skeleton className="h-10 w-64 bg-slate-300" />
            <Skeleton className="h-6 w-96 bg-slate-300" />
            <div className="flex gap-3 pt-4">
              <Skeleton className="h-12 w-40 rounded-xl bg-slate-300" />
              <Skeleton className="h-12 w-40 rounded-xl bg-slate-300" />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 h-24 flex flex-col justify-center">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-8 w-12" />
            </div>
          ))}
        </div>

        {/* Classes Grid */}
        <div>
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}