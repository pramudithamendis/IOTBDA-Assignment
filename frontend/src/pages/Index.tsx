import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SoundCard } from "@/components/real-time-cards/SoundCard";
import { ConnectionCard } from "@/components/ConnectionCard";

const Index = () => {
  const [sound, setSound] = useState(0);
  const [history, setHistory] = useState([]);

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