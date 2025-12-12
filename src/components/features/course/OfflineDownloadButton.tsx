'use client';

import { useState, useEffect } from 'react';
import { useOfflineManager } from '@/hooks/useOfflineManager';
import { Download, Check, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface OfflineDownloadButtonProps {
  id: string;
  courseId: string;
  fileUrl: string;
  fileName: string;
  type?: 'handout' | 'syllabus';
  variant?: 'icon' | 'full';
}

export function OfflineDownloadButton({ 
  id, 
  courseId, 
  fileUrl, 
  fileName, 
  type = 'handout',
  variant = 'icon' 
}: OfflineDownloadButtonProps) {
  
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(false);
  const { checkStatus, downloadMaterial, deleteMaterial } = useOfflineManager();

  // Check status on mount
  useEffect(() => {
    checkStatus(id).then(setIsOffline);
  }, [id]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setLoading(true);
    
    if (isOffline) {
      await deleteMaterial(id);
      setIsOffline(false);
    } else {
      const success = await downloadMaterial(id, courseId, fileUrl, fileName, type);
      if (success) setIsOffline(true);
    }
    
    setLoading(false);
  };

  if (variant === 'icon') {
    return (
      <button 
        onClick={handleToggle}
        disabled={loading}
        className={`p-2 rounded-full transition-all ${
          isOffline 
            ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600' 
            : 'bg-slate-100 text-slate-500 hover:bg-blue-100 hover:text-blue-600'
        }`}
        title={isOffline ? "Remove from Offline" : "Download for Offline"}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isOffline ? (
          <Check className="w-4 h-4" /> 
        ) : (
          <Download className="w-4 h-4" />
        )}
      </button>
    );
  }

  return (
    <Button 
      onClick={handleToggle} 
      variant={isOffline ? "secondary" : "outline"}
      className="gap-2 w-full justify-center"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isOffline ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
      {isOffline ? "Available Offline" : "Download"}
    </Button>
  );
}