import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertData {
  temperature?: number;
  humidity?: number;
  sound_level?: number;
  light_intensity?: number;
  motion_detected?: number;
  distance?: number;
}

interface Alert {
  id: number;
  message: string;
  reasons: string[];
  timestamp: string;
  data?: AlertData;
}

interface Props {
  alerts: Alert[];
  onDismiss?: (id: number) => void;
}

const reasonLabels: Record<string, string> = {
  high_motion: "High Motion",
  high_temperature: "High Temperature",
  high_noise: "High Noise",
  light_exposure: "Light Exposure",
  unknown_pattern: "Unknown Pattern",
};

export function AlertCard({ alerts, onDismiss }: Props) {
  if (alerts.length === 0) {
    return (
      <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Alerts
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-sm text-muted-foreground">
              No active alerts
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-red-500/30 bg-card/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-red-400 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          Alerts ({alerts.length})
        </CardTitle>
        <AlertTriangle className="h-4 w-4 text-red-400" />
      </CardHeader>
      <CardContent className="space-y-2 max-h-64 overflow-y-auto">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              "relative rounded-lg border border-red-500/20 bg-red-500/5 p-3",
              "animate-in slide-in-from-top-2 fade-in duration-300"
            )}
          >
            {/* Dismiss button */}
            {onDismiss && (
              <button
                onClick={() => onDismiss(alert.id)}
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Alert message */}
            <p className="text-sm font-medium text-red-400 pr-5">
              {alert.message}
            </p>

            {/* Reason badges */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {alert.reasons?.map((reason, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400"
                >
                  {reasonLabels[reason] || reason}
                </span>
              ))}
            </div>

            {/* Timestamp */}
            <p className="text-xs text-muted-foreground/70 mt-2">
              {new Date(alert.timestamp).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              })}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
