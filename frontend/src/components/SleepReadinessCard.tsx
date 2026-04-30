import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Moon, CheckCircle, XCircle } from "lucide-react";

interface Props {
  readiness: number;

  temperature: number;
  humidity: number;
  sound: number;
  light: number;
}

export function SleepReadinessCard({
  readiness,
  temperature,
  humidity,
  sound,
  light,
}: Props) {

  // derive label from ML score
  const getLabel = () => {
    if (readiness >= 80) return "Ready";
    if (readiness >= 60) return "Moderate";
    return "Not Ready";
  };

  const getColor = () => {
    if (readiness >= 80) return "text-green-600";
    if (readiness >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getBarColor = () => {
    if (readiness >= 80) return "bg-green-600";
    if (readiness >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  // UI explainability checks
  const checkTemperature = () => temperature >= 24 && temperature <= 27;
  const checkHumidity = () => humidity >= 40 && humidity <= 60;
  const checkSound = () => sound < 40;
  const checkLight = () => light < 10;

  const Indicator = ({ ok }: { ok: boolean }) =>
    ok ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Sleep Readiness
        </CardTitle>
        <Moon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>

      <CardContent className="space-y-4">

        {/* ML context */}
        <div className="text-xs text-muted-foreground">
          Based on learned sleep patterns
        </div>

        {/* Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={`text-sm font-medium ${getColor()}`}>
              {getLabel()}
            </span>
            <span className="text-2xl font-bold text-foreground">
              {readiness}%
            </span>
          </div>

          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getBarColor()}`}
              style={{ width: `${readiness}%` }}
            />
          </div>
        </div>

        {/* Sensor explanation */}
        <div className="space-y-2">
          <div className="text-xs font-medium uppercase text-muted-foreground">
            Environmental Factors
          </div>

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span>Temperature</span>
              <Indicator ok={checkTemperature()} />
            </div>

            <div className="flex justify-between">
              <span>Humidity</span>
              <Indicator ok={checkHumidity()} />
            </div>

            <div className="flex justify-between">
              <span>Light</span>
              <Indicator ok={checkLight()} />
            </div>

            <div className="flex justify-between">
              <span>Noise</span>
              <Indicator ok={checkSound()} />
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}