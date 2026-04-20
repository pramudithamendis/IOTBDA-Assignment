import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

interface Props {
  lightIntensity: number;
  history: number[];
  min: number;
  max: number;
}

export function LightCard({ lightIntensity, history, min, max }: Props) {
  // Typical indoor lighting guidance (in lux)
  const getStatus = (intensity: number): 'normal' | 'warning' | 'critical' => {
    if (intensity < 50) return 'critical';
    if (intensity < 200) return 'warning';
    return 'normal';
  };

  const status = getStatus(lightIntensity);

  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Light Intensity</CardTitle>
        <Lightbulb className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span
            className="text-4xl font-bold tracking-tight text-foreground transition-all duration-500"
            key={lightIntensity}
          >
            {Math.round(lightIntensity)}
          </span>
          <span className="text-lg text-muted-foreground">lux</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
          </div>
          <div className="text-xs text-muted-foreground">
            {Math.round(min)} lux — {Math.round(max)} lux
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
