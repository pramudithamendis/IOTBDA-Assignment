import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SoundCard } from "@/components/real-time-cards/SoundCard";
import { TemperatureCard } from "@/components/real-time-cards/TemperatureCard";
import { HumidityCard } from "@/components/real-time-cards/HumidityCard";
import { ConnectionCard } from "@/components/ConnectionCard";

const Index = () => {
  const [sound, setSound] = useState(0);
  const [history, setHistory] = useState([]);

  const [temperature, setTemperature] = useState(0);
  const [tempHistory, setTempHistory] = useState<number[]>([]);
  
  const [humidity, setHumidity] = useState(0);
  const [humidityHistory, setHumidityHistory] = useState<number[]>([]);

  // connection state
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [updateCount, setUpdateCount] = useState(0);
  
  useEffect(() => {

    // Load initial values from MongoDB
    fetch('http://localhost:8000/api/sensors/latest?limit=1')
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          const latest = data[0];
          if (latest.temperature) setTemperature(latest.temperature);
          if (latest.humidity) setHumidity(latest.humidity);
          if (latest.sound_level) setSound(latest.sound_level);
        }
      })
      .catch(err => console.error('Initial load failed:', err));

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
        reconnectTimer = setTimeout(connect, 2000); // retry after 2s
      };

      socket.onerror = () => {
        setIsConnected(false);
        socket.close(); // triggers onclose → reconnect
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.sound_level !== undefined) {
          setSound(data.sound_level);
          setHistory((prev) => [...prev, data.sound_level].slice(-20));
          setLastUpdated(new Date().toISOString());
          setUpdateCount((prev) => prev + 1);
        }

        if (data.temperature !== undefined) {
          setTemperature(data.temperature);
          setTempHistory((prev) => [...prev, data.temperature].slice(-20));
        }

        if (data.humidity !== undefined) {
          setHumidity(data.humidity);
          setHumidityHistory((prev) => [...prev, data.humidity].slice(-20));
        }
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);

  // safe min/max handling
  const minValue = history.length ? Math.min(...history) : sound;
  const maxValue = history.length ? Math.max(...history) : sound;
  
  const tempMin = tempHistory.length ? Math.min(...tempHistory) : temperature;
  const tempMax = tempHistory.length ? Math.max(...tempHistory) : temperature;
  
  const humidityMin = humidityHistory.length ? Math.min(...humidityHistory) : humidity;
  const humidityMax = humidityHistory.length ? Math.max(...humidityHistory) : humidity;

  return (
    <DashboardLayout title="Dashboard">
      <div className="flex flex-col w-full h-full p-6">
        {/* Connection status at top */}
        <div className="mb-6">
          <ConnectionCard
            isConnected={isConnected}
            lastUpdated={lastUpdated}
            updateCount={updateCount}
          />
        </div>

        {/* Sensor cards grid */}
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