import { Skeleton } from '../Skeleton';

export function CourseSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <Skeleton className="h-4 w-24 mb-6" />
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-6 border-l-4 border-gray-200 flex justify-between items-start">
          <div className="space-y-3">
            <Skeleton className="h-10 w-96" />
            <Skeleton className="h-5 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-200 mb-6 pb-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-40" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Handout */}
            <div className="bg-white rounded-xl shadow-sm p-6 h-40 flex flex-col justify-center space-y-4">
              <Skeleton className="h-6 w-48" />
              <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
            </div>

            {/* Topics */}
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 h-48">
                  <div className="flex justify-between mb-4">
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-64" />
                      <Skeleton className="h-4 w-96" />
                    </div>
                    <Skeleton className="h-8 w-20 rounded-full" />
                  </div>
                  <div className="flex gap-2 mt-8">
                    <Skeleton className="h-8 w-24 rounded-lg" />
                    <Skeleton className="h-8 w-24 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm h-64">
              <Skeleton className="h-6 w-40 mb-6" />
              <div className="space-y-4">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}