import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Insight {
  title: string;
  description: string;
  type: "positive" | "warning";
}

interface Props {
  insights: Insight[];
}

export function InsightsCard({ insights }: Props) {
  return (
    <Card className="bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">
          Sleep Insights
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {insights.length === 0 && (
          <div className="text-sm text-muted-foreground">
            No insights available yet
          </div>
        )}

        {insights.map((insight, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg text-sm ${
              insight.type === "positive"
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            <div className="font-medium">{insight.title}</div>
            <div className="text-xs">{insight.description}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}