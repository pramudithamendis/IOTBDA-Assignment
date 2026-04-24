// components/SleepQualityCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SleepQualityCard() {
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">
          Overall Sleep Quality Score
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center h-[160px]">
        <div className="text-center">
          <div className="text-4xl font-bold">--</div>
          <div className="text-sm text-muted-foreground mt-2">
            Overall Sleep Quality Score
          </div>
        </div>
      </CardContent>
    </Card>
  );
}