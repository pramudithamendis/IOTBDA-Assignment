import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SleepQualityCard() {
  const score = 80; // placeholder value
  const radius = 60;
  const stroke = 10;
  const normalizedRadius = radius - stroke * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset =
    circumference - (score / 100) * circumference;

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground text-center">
          Overall Sleep Quality Score
        </CardTitle>
        <p className="text-xs text-center text-muted-foreground">
          Last night • Based on overnight data
        </p>
      </CardHeader>

      <CardContent className="flex flex-col items-center justify-center gap-4">
        
        {/* Circular Gauge */}
        <div className="relative flex items-center justify-center">
          <svg height={radius * 2} width={radius * 2}>
            {/* Background circle */}
            <circle
              stroke="currentColor"
              fill="transparent"
              strokeWidth={stroke}
              className="text-muted/20"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
            />

            {/* Progress circle */}
            <circle
              stroke="currentColor"
              fill="transparent"
              strokeWidth={stroke}
              strokeDasharray={`${circumference} ${circumference}`}
              style={{ strokeDashoffset }}
              strokeLinecap="round"
              className="text-blue-500 transition-all duration-500"
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              transform={`rotate(-90 ${radius} ${radius})`}
            />
          </svg>

          {/* Score text */}
          <div className="absolute flex flex-col items-center">
            <span className="text-4xl font-bold">{score}</span>
            <span className="text-sm text-muted-foreground">
              out of 100
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="px-4 py-1 rounded-full border text-sm text-blue-500 border-blue-300">
          Good
        </div>

      </CardContent>
    </Card>
  );
}