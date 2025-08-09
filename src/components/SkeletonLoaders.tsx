import React from 'react';

// Basic skeleton for cards
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`glass-card p-6 rounded-2xl animate-pulse ${className}`}>
    <div className="flex items-center gap-4 mb-4">
      <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
      <div className="flex-1">
        <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded-lg w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/2"></div>
      </div>
    </div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-full"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-2/3"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/3"></div>
    </div>
  </div>
);

// Video list skeleton
export const VideoListSkeleton: React.FC = () => (
  <div className="space-y-8">
    {/* Header skeleton */}
    <div className="glass-card p-6 rounded-2xl animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
          <div>
            <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded-lg w-32 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-48"></div>
          </div>
        </div>
        <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded-full w-20"></div>
      </div>
    </div>

    {/* Video cards skeleton */}
    <div className="space-y-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="glass-card p-6 rounded-2xl animate-pulse">
          <div className="md:flex gap-6">
            {/* Thumbnail skeleton */}
            <div className="md:w-64 h-36 bg-gray-300 dark:bg-gray-600 rounded-xl mb-4 md:mb-0"></div>
            
            {/* Content skeleton */}
            <div className="flex-1">
              <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded-lg w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-full mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-2/3 mb-4"></div>
              
              <div className="flex gap-4 mb-4">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-24"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-20"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-28"></div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded-full w-20"></div>
                <div className="flex gap-2">
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-20"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-24"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Upload form skeleton
export const UploadSkeleton: React.FC = () => (
  <div className="space-y-8">
    {/* Header skeleton */}
    <div className="glass-card p-6 rounded-2xl animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
        <div>
          <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded-lg w-40 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-64"></div>
        </div>
      </div>
    </div>

    {/* Upload form skeleton */}
    <div className="glass-card p-8 rounded-2xl animate-pulse">
      <div className="space-y-6">
        <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600"></div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20 mb-2"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          </div>
          <div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24 mb-2"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          </div>
        </div>
        
        <div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-28 mb-2"></div>
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        </div>
        
        <div className="h-12 bg-gray-300 dark:bg-gray-600 rounded-xl w-full"></div>
      </div>
    </div>
  </div>
);

// Account management skeleton
export const AccountSkeleton: React.FC = () => (
  <div className="space-y-8">
    {/* Create account skeleton */}
    <div className="glass-card p-8 rounded-2xl animate-pulse">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
        <div>
          <div className="h-7 bg-gray-300 dark:bg-gray-600 rounded-lg w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-80"></div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-28 mb-2"></div>
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        </div>
        <div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32 mb-2"></div>
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        </div>
      </div>
      
      <div className="h-12 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
    </div>

    {/* Account list skeleton */}
    <div className="glass-card p-8 rounded-2xl animate-pulse">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
        <div>
          <div className="h-7 bg-gray-300 dark:bg-gray-600 rounded-lg w-36 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-72"></div>
        </div>
      </div>
      
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
                <div>
                  <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-32 mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                </div>
              </div>
              <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded-full w-16"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Admin panel skeleton
export const AdminSkeleton: React.FC = () => (
  <div className="space-y-8">
    {/* Header skeleton */}
    <div className="glass-card p-6 rounded-2xl animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
          <div>
            <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded-lg w-36 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-56"></div>
          </div>
        </div>
        <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded-full w-24"></div>
      </div>
    </div>

    {/* Create editor skeleton */}
    <div className="glass-card p-8 rounded-2xl animate-pulse">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
        <div>
          <div className="h-7 bg-gray-300 dark:bg-gray-600 rounded-lg w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-80"></div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i}>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20 mb-2"></div>
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          </div>
        ))}
      </div>
      
      <div className="h-12 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
    </div>

    {/* Editors list skeleton */}
    <div className="glass-card p-8 rounded-2xl animate-pulse">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
        <div>
          <div className="h-7 bg-gray-300 dark:bg-gray-600 rounded-lg w-32 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-72"></div>
        </div>
      </div>
      
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
                <div className="flex-1">
                  <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-32 mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-1"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-28"></div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded-full w-16"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20"></div>
                <div className="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Dashboard skeleton
export const DashboardSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900">
    {/* Header skeleton */}
    <div className="sticky top-0 z-40 glass-header backdrop-blur-md bg-white/70 dark:bg-gray-900/70 border-b border-white/20 dark:border-gray-700/50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-2xl animate-pulse"></div>
            <div>
              <div className="h-7 bg-gray-300 dark:bg-gray-600 rounded w-32 mb-1 animate-pulse"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded-full w-20 animate-pulse"></div>
            <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>

    {/* Content skeleton */}
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Tab navigation skeleton */}
      <div className="mb-8">
        <div className="flex space-x-1 bg-white/50 dark:bg-gray-800/50 p-1 rounded-2xl backdrop-blur-sm border border-white/20 dark:border-gray-700/50 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl w-32"></div>
          ))}
        </div>
      </div>

      {/* Tab content skeleton */}
      <div className="animate-pulse">
        <CardSkeleton className="mb-6" />
        <CardSkeleton className="mb-6" />
        <CardSkeleton />
      </div>
    </div>
  </div>
);
