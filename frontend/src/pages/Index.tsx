import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SoundCard } from "@/components/real-time-cards/SoundCard";
import { TemperatureCard } from "@/components/real-time-cards/TemperatureCard";
import { HumidityCard } from "@/components/real-time-cards/HumidityCard";
import { ConnectionCard } from "@/components/ConnectionCard";

const Index = () => {
  const [sound, setSound] = useState(0);
  const [history, setHistory] = useState<number[]>([]);

  const [temperature, setTemperature] = useState(0);
  const [tempHistory, setTempHistory] = useState<number[]>([]);
  
  const [humidity, setHumidity] = useState(0);
  const [humidityHistory, setHumidityHistory] = useState<number[]>([]);

  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  useEffect(() => {

    // =========================
    // 1. MONGO FALLBACK (ONCE)
    // =========================
    const loadFallback = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/sensors/latest?limit=20");
        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) return;

        const latest = data[0]; // already sorted newest first

        setTemperature(Number(latest.temperature ?? 0));
        setHumidity(Number(latest.humidity ?? 0));
        setSound(Number(latest.sound_level ?? 0));

        setTempHistory(data.map(d => Number(d.temperature ?? 0)));
        setHumidityHistory(data.map(d => Number(d.humidity ?? 0)));
        setHistory(data.map(d => Number(d.sound_level ?? 0)));

        setLastUpdated(latest.timestamp ?? null);

      } catch (err) {
        console.error("Fallback load failed:", err);
      }
    };

    loadFallback();

    // =========================
    // 2. WEBSOCKET (LIVE)
    // =========================
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

        // LIVE OVERRIDES FALLBACK
        if (data.temperature !== undefined) {
          setTemperature(Number(data.temperature));
          setTempHistory(prev => [...prev, Number(data.temperature)].slice(-20));
        }

        if (data.humidity !== undefined) {
          setHumidity(Number(data.humidity));
          setHumidityHistory(prev => [...prev, Number(data.humidity)].slice(-20));
        }

        if (data.sound_level !== undefined) {
          setSound(Number(data.sound_level));
          setHistory(prev => [...prev, Number(data.sound_level)].slice(-20));
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
  // MIN/MAX
  // =========================
  const minValue = history.length ? Math.min(...history) : sound;
  const maxValue = history.length ? Math.max(...history) : sound;

  const tempMin = tempHistory.length ? Math.min(...tempHistory) : temperature;
  const tempMax = tempHistory.length ? Math.max(...tempHistory) : temperature;

  const humidityMin = humidityHistory.length ? Math.min(...humidityHistory) : humidity;
  const humidityMax = humidityHistory.length ? Math.max(...humidityHistory) : humidity;

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">

          <TemperatureCard
            temperature={temperature}
            history={tempHistory}
            min={tempMin}
            max={tempMax}
          />

          <HumidityCard
            humidity={humidity}
            history={humidityHistory}
            min={humidityMin}
            max={humidityMax}
          />

          <SoundCard
            sound={sound}
            history={history}
            min={minValue}
            max={maxValue}
          />

          <SoundCard
            sound={sound}
            history={history}
            min={minValue}
            max={maxValue}
          />

        </div>
      </div>

    </DashboardLayout>
  );
};

export default Index;