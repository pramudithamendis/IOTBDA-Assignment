import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface Insight {
  title: string;
  description: string;
  type: "positive" | "warning" | "neutral";
  confidence?: number;
}

interface Props {
  insights: Insight[];
}

export function InsightsCard({ insights }: Props) {
  return (
    <Card className="bg-card border border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Activity className="h-4 w-4" />
          Sleep Insights
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {insights.length === 0 && (
          <div className="text-sm text-muted-foreground">
            No insights available yet
          </div>
        )}

        {insights.map((insight, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border transition
              ${getCardStyle(insight.type)}
            `}
          >
            {/* Header */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2 font-medium">
                {getIcon(insight.type)}
                <span className="text-foreground">{insight.title}</span>
              </div>

              {insight.confidence && (
                <span className="text-xs text-muted-foreground">
                  {insight.confidence}% confidence
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground mt-2">
              {insight.description}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Card styles (light + dark mode)
function getCardStyle(type: "positive" | "warning" | "neutral") {
  switch (type) {
    case "positive":
      return `
        border-green-200 bg-green-50
        dark:border-green-800 dark:bg-green-900/20
      `;
    case "warning":
      return `
        border-red-200 bg-red-50
        dark:border-red-800 dark:bg-red-900/20
      `;
    default:
      return `
        border-blue-200 bg-blue-50
        dark:border-blue-800 dark:bg-blue-900/20
      `;
  }
}

// Icons
function getIcon(type: "positive" | "warning" | "neutral") {
  switch (type) {
    case "positive":
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case "warning":
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    default:
      return <Activity className="h-4 w-4 text-blue-500" />;
  }
}