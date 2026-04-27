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

  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  const [insights, setInsights] = useState<any[]>([]);

  // =========================
  // Mongo fallback (initial load)
  // =========================
  useEffect(() => {
    const loadFallback = async () => {
      try {
        const res = await fetch("http://localhost:8000/sensors/latest?limit=20");
        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) return;

        const latest = data[0];

        setTemperature(Number(latest.temperature ?? 0));
        setHumidity(Number(latest.humidity ?? 0));
        setSound(Number(latest.sound_level ?? 0));
        setLightIntensity(Number(latest.light_intensity ?? 0));

        setTempHistory(data.map(d => Number(d.temperature ?? 0)));
        setHumidityHistory(data.map(d => Number(d.humidity ?? 0)));
        setHistory(data.map(d => Number(d.sound_level ?? 0)));
        setLightIntensityHistory(data.map(d => Number(d.light_intensity ?? 0)));

        setLastUpdated(latest.timestamp ?? null);
        setUpdateCount(data.length);

      } catch (err) {
        console.error("Fallback load failed:", err);
      }
    };

    loadFallback();
  }, []);

  // =========================
  // WebSocket (live updates)
  // =========================
  useEffect(() => {
    let socket: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      socket = new WebSocket("ws://localhost:8000/ws/sensors");

      socket.onopen = () => {
        setIsConnected(true);
      };

      socket.onclose = () => {
        setIsConnected(false);
        reconnectTimer = setTimeout(connect, 2000);
      };

      socket.onerror = () => {
        setIsConnected(false);
        socket.close();
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.sound_level !== undefined) {
          setSound(Number(data.sound_level));
          setHistory(prev => [...prev, Number(data.sound_level)].slice(-20));
        }

        if (data.light_intensity !== undefined) {
          setLightIntensity(Number(data.light_intensity));
          setLightIntensityHistory(prev =>
            [...prev, Number(data.light_intensity)].slice(-20)
          );
        }

        if (data.temperature !== undefined) {
          setTemperature(Number(data.temperature));
          setTempHistory(prev =>
            [...prev, Number(data.temperature)].slice(-20)
          );
        }

        if (data.humidity !== undefined) {
          setHumidity(Number(data.humidity));
          setHumidityHistory(prev =>
            [...prev, Number(data.humidity)].slice(-20)
          );
        }

        setLastUpdated(new Date().toISOString());
        setUpdateCount(prev => prev + 1);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);

  // =========================
  // Fetch insights
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

    fetchInsights();
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

  return (
    <DashboardLayout title="Dashboard">
      <div className="flex flex-col w-full h-full p-6">

        <div className="mb-6">
          <ConnectionCard
            isConnected={isConnected}
            lastUpdated={lastUpdated}
            updateCount={updateCount}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <SleepQualityCard />

          <SleepReadinessCard
            temperature={temperature}
            humidity={humidity}
            sound={sound}
            light={lightIntensity}
          />
        </div>

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

        <div className="mb-6">
          <br />
          <InsightsCard insights={insights} />
        </div>

      </div>
    </DashboardLayout>
  );
};

export default Index;