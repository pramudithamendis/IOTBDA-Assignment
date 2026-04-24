import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplet } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

interface Props {
  humidity: number;
  history: number[];
  min: number;
  max: number;
}

export function HumidityCard({ humidity, history, min, max }: Props) {
  const getStatus = (humidityLevel: number): 'normal' | 'warning' | 'critical' => {
    if (humidityLevel < 30 || humidityLevel > 70) return 'critical';
    if (humidityLevel < 40 || humidityLevel > 60) return 'warning';
    return 'normal';
  };

  const status = getStatus(humidity);

  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Humidity</CardTitle>
        <Droplet className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span
            className="text-4xl font-bold tracking-tight text-foreground transition-all duration-500"
            key={humidity}
          >
            {humidity.toFixed(1)}
          </span>
          <span className="text-lg text-muted-foreground">%</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
          </div>
          <div className="text-xs text-muted-foreground">
            {min.toFixed(1)}% — {max.toFixed(1)}%
          </div>
        </div>
      </CardContent>
    </Card>
  );
}