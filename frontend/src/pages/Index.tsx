import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SoundCard } from "@/components/real-time-cards/SoundCard";
import { LightCard } from "@/components/real-time-cards/LightCard";
import { TemperatureCard } from "@/components/real-time-cards/TemperatureCard";
import { HumidityCard } from "@/components/real-time-cards/HumidityCard";
import { ConnectionCard } from "@/components/ConnectionCard";

const Index = () => {
  const [sound, setSound] = useState(0);
  const [history, setHistory] = useState([]);
  const [lightIntensity, setLightIntensity] = useState(0);
  const [lightIntensityHistory, setLightIntensityHistory] = useState([]);
  const [temperature, setTemperature] = useState(0);
  const [tempHistory, setTempHistory] = useState([]);
  const [humidity, setHumidity] = useState(0);
  const [humidityHistory, setHumidityHistory] = useState([]);
  
  // connection state
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [updateCount, setUpdateCount] = useState(0);
  

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

      if (data.light_intensity !== undefined) {
        setLightIntensity(data.light_intensity);
        setLightIntensityHistory((prev) => [...prev, data.light_intensity].slice(-20));
        setLastUpdated(new Date().toISOString());
        setUpdateCount((prev) => prev + 1);
      }

      if (data.temperature !== undefined) {
        setTemperature(data.temperature);
        setTempHistory((prev) => [...prev, data.temperature].slice(-20));
        setLastUpdated(new Date().toISOString());
        setUpdateCount((prev) => prev + 1);
      }

      if (data.humidity !== undefined) {
        setHumidity(data.humidity);
        setHumidityHistory((prev) => [...prev, data.humidity].slice(-20));
        setLastUpdated(new Date().toISOString());
        setUpdateCount((prev) => prev + 1);
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
  const minLightIntensityValue = lightIntensityHistory.length ? Math.min(...lightIntensityHistory) : lightIntensity;
  const maxLightIntensityValue = lightIntensityHistory.length ? Math.max(...lightIntensityHistory) : lightIntensity;
  const minTemp = tempHistory.length ? Math.min(...tempHistory) : temperature;
  const maxTemp = tempHistory.length ? Math.max(...tempHistory): temperature;
  const minHumidity = humidityHistory.length ? Math.min(...humidityHistory) : humidity;
  const maxHumidity = humidityHistory.length ? Math.max(...humidityHistory) : humidity;

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

        {/* Sensor cards grid - now fills the width */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          <LightCard
            lightIntensity={lightIntensity}
            history={lightIntensityHistory}
            min={minLightIntensityValue}
            max={maxLightIntensityValue}
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
      </div>
    </DashboardLayout>
  );
};

export default Index;