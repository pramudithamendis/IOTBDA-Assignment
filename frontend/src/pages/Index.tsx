import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SoundCard } from "@/components/real-time-cards/SoundCard";
import { LightCard } from "@/components/real-time-cards/LightCard";
import { TemperatureCard } from "@/components/real-time-cards/TemperatureCard";
import { HumidityCard } from "@/components/real-time-cards/HumidityCard";
import { ConnectionCard } from "@/components/ConnectionCard";
import { SleepReadinessCard } from "@/components/SleepReadinessCard";
import { SleepQualityCard } from "@/components/SleepQualityCard";
import { InsightsCard } from "@/components/InsightsCard";

const Index = () => {
  const [sound, setSound] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [lightIntensity, setLightIntensity] = useState(0);
  const [lightIntensityHistory, setLightIntensityHistory] = useState<number[]>([]);
  const [temperature, setTemperature] = useState(0);
  const [tempHistory, setTempHistory] = useState<number[]>([]);
  const [humidity, setHumidity] = useState(0);
  const [humidityHistory, setHumidityHistory] = useState<number[]>([]);

  // connection state
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  // insights
  const [insights, setInsights] = useState<any[]>([]);

  // =========================
  // WebSocket connection
  // =========================
  useEffect(() => {
    let socket: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      socket = new WebSocket("ws://localhost:8000/ws/sensors");

      socket.onopen = () => {
        setIsConnected(true);
        console.log("WebSocket connected");
      };

      socket.onclose = () => {
        setIsConnected(false);
        console.log("WebSocket disconnected, retrying in 2s...");
        reconnectTimer = setTimeout(connect, 2000);
      };

      socket.onerror = () => {
        setIsConnected(false);
        socket.close();
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.sound_level !== undefined) {
          setSound(data.sound_level);
          setHistory((prev) => [...prev, data.sound_level].slice(-20));
        }

        if (data.light_intensity !== undefined) {
          setLightIntensity(data.light_intensity);
          setLightIntensityHistory((prev) =>
            [...prev, data.light_intensity].slice(-20)
          );
        }

        if (data.temperature !== undefined) {
          setTemperature(data.temperature);
          setTempHistory((prev) =>
            [...prev, data.temperature].slice(-20)
          );
        }

        if (data.humidity !== undefined) {
          setHumidity(data.humidity);
          setHumidityHistory((prev) =>
            [...prev, data.humidity].slice(-20)
          );
        }

        setLastUpdated(new Date().toISOString());
        setUpdateCount((prev) => prev + 1);
        
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);

  // =========================
  // Fetch insights (REST API)
  // =========================
  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const res = await fetch("http://localhost:8000/insights");
        const data = await res.json();
        setInsights(data.insights || []);
      } catch (err) {
        console.error("Failed to fetch insights", err);
        setInsights([]);
      }
    };

    // initial fetch
    fetchInsights();

    // refresh every 5 seconds
    const interval = setInterval(fetchInsights, 5000);

    return () => clearInterval(interval);
  }, []);

  // =========================
  // Min / Max calculations
  // =========================
  const minValue = history.length ? Math.min(...history) : sound;
  const maxValue = history.length ? Math.max(...history) : sound;

  const minLight = lightIntensityHistory.length
    ? Math.min(...lightIntensityHistory)
    : lightIntensity;

  const maxLight = lightIntensityHistory.length
    ? Math.max(...lightIntensityHistory)
    : lightIntensity;

  const minTemp = tempHistory.length
    ? Math.min(...tempHistory)
    : temperature;

  const maxTemp = tempHistory.length
    ? Math.max(...tempHistory)
    : temperature;

  const minHumidity = humidityHistory.length
    ? Math.min(...humidityHistory)
    : humidity;

  const maxHumidity = humidityHistory.length
    ? Math.max(...humidityHistory)
    : humidity;

    const generateRealtimeInsights = () => {
      const insights = [];

      if (sound > 40) {
        insights.push({
          title: "🔊 Noise Alert",
          description: "Noise is currently high and may disturb your sleep.",
          type: "warning",
        });
      } else {
        insights.push({
          title: "🌙 Quiet Environment",
          description: "Noise levels are currently low — ideal for sleep.",
          type: "positive",
        });
      }

      if (temperature >= 24 && temperature <= 27) {
        insights.push({
          title: "🌡 Optimal Temperature",
          description: "Room temperature is within the ideal range.",
          type: "positive",
        });
      } else {
        insights.push({
          title: "🌡 Temperature Issue",
          description: "Temperature is outside the ideal range.",
          type: "warning",
        });
      }

      if (lightIntensity < 10) {
        insights.push({
          title: "💡 Low Light",
          description: "Lighting is suitable for sleep.",
          type: "positive",
        });
      } else {
        insights.push({
          title: "💡 Too Bright",
          description: "Light levels are too high.",
          type: "warning",
        });
      }

      if (humidity >= 40 && humidity <= 60) {
        insights.push({
          title: "💧 Comfortable Humidity",
          description: "Humidity is in a comfortable range.",
          type: "positive",
        });
      } else {
        insights.push({
          title: "💧 Humidity Issue",
          description: "Humidity may affect sleep comfort.",
          type: "warning",
        });
      }

    return insights;
  };
  // =========================
  // UI
  // =========================
  return (
    <DashboardLayout title="Dashboard">
      <div className="flex flex-col w-full h-full p-6">

        {/* Connection */}
        <div className="mb-6">
          <ConnectionCard
            isConnected={isConnected}
            lastUpdated={lastUpdated}
            updateCount={updateCount}
          />
        </div>

        {/* Sleep Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <SleepQualityCard />

          <SleepReadinessCard
            temperature={temperature}
            humidity={humidity}
            sound={sound}
            light={lightIntensity}
          />
        </div>

        {/* Sensors */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          <LightCard
            lightIntensity={lightIntensity}
            history={lightIntensityHistory}
            min={minLight}
            max={maxLight}
          />

          <SoundCard
            sound={sound}
            history={history}
            min={minValue}
            max={maxValue}
          />

          <TemperatureCard
            temperature={temperature}
            history={tempHistory}
            min={minTemp}
            max={maxTemp}
          />

          <HumidityCard
            humidity={humidity}
            history={humidityHistory}
            min={minHumidity}
            max={maxHumidity}
          />
        </div>
         {/* Insights Section */}
        <div className="mb-6">
          <InsightsCard insights={insights} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;