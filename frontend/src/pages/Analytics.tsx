import { useEffect, useMemo, useState } from "react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type Timeframe = "7d" | "30d" | "overnight";
type MetricKey = "sleep_quality" | "light" | "noise" | "temperature" | "humidity" | "movement";

type HistoricalPoint = {
  label: string;
  sleep_quality?: number | null;
  light: number;
  noise: number;
  temperature: number;
  humidity: number;
  movement: number;
  motion_events: number;
};

const metricConfig: Record<
  MetricKey,
  { label: string; dataKey: MetricKey; color: string; unit: string }
> = {
  sleep_quality: { label: "Sleep Quality", dataKey: "sleep_quality", color: "#6366f1", unit: "score" },
  light: { label: "Light", dataKey: "light", color: "#e3a72f", unit: "lux" },
  noise: { label: "Noise", dataKey: "noise", color: "#8b5cf6", unit: "dB" },
  temperature: { label: "Temperature", dataKey: "temperature", color: "#ef4444", unit: "C" },
  humidity: { label: "Humidity", dataKey: "humidity", color: "#3b82f6", unit: "%" },
  movement: { label: "Movement", dataKey: "movement", color: "#10b981", unit: "cm" },
};

const timeframeButtons: Array<{ label: string; value: Timeframe }> = [
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "Overnight", value: "overnight" },
];

const metricTabs: Array<{ label: string; value: MetricKey }> = [
  { label: "Sleep Quality", value: "sleep_quality" },
  { label: "Light", value: "light" },
  { label: "Noise", value: "noise" },
  { label: "Temperature", value: "temperature" },
  { label: "Humidity", value: "humidity" },
  { label: "Movement", value: "movement" },
];

const Analytics = () => {
  const [timeframe, setTimeframe] = useState<Timeframe>("7d");
  const [activeMetric, setActiveMetric] = useState<MetricKey>("sleep_quality");
  const [chartPoints, setChartPoints] = useState<HistoricalPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();

    const loadHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `http://localhost:8000/api/historical-analysis?user_id=user_001&timeframe=${timeframe}`,
          { signal: abortController.signal },
        );

        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`);
        }

        const payload = await response.json();
        setChartPoints(payload.points ?? []);
      } catch (fetchError) {
        if ((fetchError as Error).name !== "AbortError") {
          setError("Unable to load historical sensor data.");
          setChartPoints([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
    return () => abortController.abort();
  }, [timeframe]);

  const activeConfig = metricConfig[activeMetric];
  const chartConfig = useMemo(
    () => ({
      [activeConfig.dataKey]: {
        label: `${activeConfig.label} (${activeConfig.unit})`,
        color: activeConfig.color,
      },
    }),
    [activeConfig],
  );

  return (
    <DashboardLayout title="Historical Analysis">
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-3xl">Historical Analysis</CardTitle>
          <CardDescription>View trends and patterns over time.</CardDescription>
          <div className="flex justify-end gap-2 pt-3">
            {timeframeButtons.map((button) => (
              <Button
                key={button.value}
                variant={timeframe === button.value ? "default" : "secondary"}
                className={timeframe === button.value ? "bg-primary text-primary-foreground" : ""}
                onClick={() => setTimeframe(button.value)}
              >
                {button.label}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeMetric} onValueChange={(value) => setActiveMetric(value as MetricKey)}>
            <TabsList className="mb-4 h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
              {metricTabs.map((tab) => (
                <TabsTrigger
                  key={tab.value + tab.label}
                  value={tab.value}
                  className="rounded-md border bg-muted px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="h-[420px] w-full rounded-lg border bg-background p-4">
            {loading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">Loading chart data...</div>
            ) : error ? (
              <div className="flex h-full items-center justify-center text-destructive">{error}</div>
            ) : chartPoints.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">No data available.</div>
            ) : (
              <ChartContainer className="h-full w-full" config={chartConfig}>
                <LineChart data={chartPoints} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={22} />
                  <YAxis tickLine={false} axisLine={false} width={48} />
                  <ChartTooltip content={<ChartTooltipContent hideIndicator={false} />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    type="monotone"
                    dataKey={activeConfig.dataKey}
                    stroke={`var(--color-${activeConfig.dataKey})`}
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default Analytics;
