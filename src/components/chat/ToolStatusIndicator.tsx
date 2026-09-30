import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';

interface ToolStatusIndicatorProps {
  status: string | null;
}

export const ToolStatusIndicator: React.FC<ToolStatusIndicatorProps> = ({ status }) => {
  if (!status) return null;

  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-blue-950/40 border border-blue-800/50 text-blue-300 text-xs animate-pulse">
      <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
      <span className="font-medium">{status}</span>
    </div>
  );
};
