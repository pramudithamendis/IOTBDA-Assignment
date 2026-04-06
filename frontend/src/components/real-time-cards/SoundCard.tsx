import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Volume2 } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

interface Props {
  sound: number;
  history: number[];
  min: number;
  max: number;
}

export function SoundCard({ sound, history, min, max }: Props) {
  // Determine status based on sound level
  const getStatus = (soundLevel: number): 'normal' | 'warning' | 'critical' => {
    if (soundLevel >= 85) return 'critical';
    if (soundLevel >= 70) return 'warning';
    return 'normal';
  };

  const status = getStatus(sound);

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Sound Level</CardTitle>
        <Volume2 className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-baseline gap-1">
          <span
            className="text-3xl font-semibold text-foreground"
            key={sound}
          >
            {sound}
          </span>
          <span className="text-sm text-muted-foreground">ACD</span>
        </div>

        <div className="flex items-center justify-between">
          <StatusBadge status={status} />
          <div className="text-xs text-muted-foreground">
            <span>{min} ACD</span>
            <span className="mx-1">—</span>
            <span>{max} ACD</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}