// StatusBadge.tsx
import React from 'react';
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: 'normal' | 'warning' | 'critical';
}

const statusConfig = {
  normal: {
    label: 'Normal',
    className: 'bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20'
  },
  warning: {
    label: 'Warning',
    className: 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20'
  },
  critical: {
    label: 'Critical',
    className: 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20'
  }
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}