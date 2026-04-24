import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Moon, Check } from "lucide-react";
import { calculateSleepReadiness, getReadinessLabel } from "@/utils/sleepReadiness";

interface Props {
  temperature: number;
  humidity: number;
  sound: number;
  light: number;
}

export function SleepReadinessCard({
  temperature,
  humidity,
  sound,
  light,
}: Props) {

  // ✅ Keep checks ONLY for UI indicators
  const checkTemperature = () => temperature >= 24 && temperature <= 27;
  const checkHumidity = () => humidity >= 40 && humidity <= 60;
  const checkSound = () => sound < 40;
  const checkLight = () => light < 10;

  // ✅ Use your weighted model
  const readiness = calculateSleepReadiness(
    temperature,
    humidity,
    light,
    sound
  );

  // ✅ Use label helper
  const { label, color } = getReadinessLabel(readiness);

  // Map to Tailwind classes
  const colorClass =
    color === "green"
      ? "text-green-600"
      : color === "yellow"
      ? "text-yellow-600"
      : "text-red-600";

  const barColor =
    readiness >= 80
      ? "bg-green-600"
      : readiness >= 60
      ? "bg-yellow-500"
      : "bg-red-500";

  return (
    <Card className="relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Sleep Readiness
        </CardTitle>
        <Moon className="h-4 w-4 text-green-600" />
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Live indicator */}
        <div className="text-xs text-muted-foreground">
          Live · Right now
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${colorClass}`}>
              {label}
            </span>
            <span className="text-2xl font-bold text-foreground">
              {readiness}%
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-all duration-500 ${barColor}`}
              style={{ width: `${readiness}%` }}
            />
          </div>
        </div>

        {/* Optimal indicator */}
        {readiness >= 80 && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Check className="h-4 w-4" />
            <span>Optimal conditions</span>
          </div>
        )}

        {/* Environmental factors */}
        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Environmental Factors
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Light Level</span>
              {checkLight() ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <span className="text-xs text-red-500">Suboptimal</span>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Temperature</span>
              {checkTemperature() ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <span className="text-xs text-red-500">Suboptimal</span>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Humidity</span>
              {checkHumidity() ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <span className="text-xs text-red-500">Suboptimal</span>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Noise Level</span>
              {checkSound() ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <span className="text-xs text-red-500">Suboptimal</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}