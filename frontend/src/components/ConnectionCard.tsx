import { Wifi } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  isConnected: boolean;
  lastUpdated: string | null;
  updateCount: number;
}

export function ConnectionCard({ isConnected, lastUpdated, updateCount }: Props) {
  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Connection
        </CardTitle>
        <Wifi className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                isConnected ? "bg-emerald-400" : "bg-red-400"
              )}
            />
            <span
              className={cn(
                "relative inline-flex h-3 w-3 rounded-full",
                isConnected ? "bg-emerald-500" : "bg-red-500"
              )}
            />
          </span>
          <span className="text-sm font-medium text-foreground">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Last Update</p>
            <p className="text-sm font-medium text-foreground">
              {lastUpdated
              ? new Date(lastUpdated).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: true, // false for 24hr
                })
              : "Never"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Readings</p>
            <p className="text-sm font-medium text-foreground">{updateCount}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Frequency</p>
            <p className="text-sm font-medium text-foreground">2s</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Protocol</p>
            <p className="text-sm font-medium text-foreground">MQTT</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}