import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Thermometer } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

interface Props {
  temperature: number;
  history: number[];
  min: number;
  max: number;
}

export function TemperatureCard({ temperature, history, min, max }: Props) {
  const getStatus = (temp: number): 'normal' | 'warning' | 'critical' => {
    if (temp < 22 || temp > 28) return 'critical';
    if (temp < 24 || temp > 27) return 'warning';
    return 'normal';
  };

  const status = getStatus(temperature);

  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Temperature</CardTitle>
        <Thermometer className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span
            className="text-4xl font-bold tracking-tight text-foreground transition-all duration-500"
            key={temperature}
          >
            {temperature.toFixed(1)}
          </span>
          <span className="text-lg text-muted-foreground">°C</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
          </div>
          <div className="text-xs text-muted-foreground">
            {min.toFixed(1)}°C — {max.toFixed(1)}°C
          </div>
        </div>
      </CardContent>
    </Card>
  );
}