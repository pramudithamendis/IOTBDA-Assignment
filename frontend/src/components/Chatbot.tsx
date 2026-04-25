import { useState } from "react";
import { MessageCircle, X } from "lucide-react";

type Message = {
  text: string;
  sender: "user" | "bot";
};

export function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      text: input,
      sender: "user",
    };

    let reply = "I can help improve your sleep 😴";

    if (input.toLowerCase().includes("temperature")) {
      reply = "Try keeping temperature between 24–27°C.";
    } else if (input.toLowerCase().includes("noise")) {
      reply = "Noise should be below 40 dB for better sleep.";
    } else if (input.toLowerCase().includes("light")) {
      reply = "Lower light levels (<10 lux) help your body relax.";
    } else if (input.toLowerCase().includes("improve")) {
      reply = "Reduce noise, dim lights, and adjust temperature for better sleep.";
    }

   setMessages((prev) => [...prev, userMessage]);
   setInput("");
   setLoading(true);

    try{

      const res = await fetch("http://localhost:8000/chat/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: input,
        user_id: "user_001",
      }),
    });

    if (!res.ok) {
        throw { status: res.status };
    }

    const data = await res.json();

    const botMessage: Message = {
      text: formatResponse(data.response),
      sender: "bot",
    };

    setMessages((prev) => [...prev, botMessage]);

    }
    catch (err: any) {
      if (err?.status === 429 || err?.code === 429) {
        setMessages((prev) => [
          ...prev,
          {
            text: "⚠️ AI limit reached. Please try again in a few seconds.",
            sender: "bot",
          },
        ]);
      }
      else {
        setMessages((prev) => [
          ...prev,
          {
            text: "⚠️ Unable to process your request right now.",
            sender: "bot",
          },
        ]);
  }}
    finally{
      setLoading(false);
    }
  };
  const formatResponse = (text: string) => {
  return text
    .replace(/\*/g, "") // remove bullets
    .replace(/\n+/g, " ") // remove line breaks
    .trim();
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-4 rounded-full shadow-xl hover:scale-105 transition"
      >
        {open ? <X /> : <MessageCircle />}
      </button>

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-20 right-6 w-80 h-[420px] bg-background text-foreground border rounded-2xl shadow-2xl flex flex-col overflow-hidden border">

          {/* Header */}
          <div className="p-4 border-b flex items-center gap-2 bg-primary text-primary-foreground">
            <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" />
            <span className="font-semibold">Sleep Assistant</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`max-w-[75%] px-3 py-2 rounded-xl ${
                  msg.sender === "user"
                    ? "ml-auto bg-blue-600 text-white"
                    : "mr-auto bg-muted text-foreground"
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/10 flex gap-2">
            <input
              className="flex-1 px-3 py-2 rounded-lg border bg-white text-gray-900 placeholder-gray-500 focus:outline-none"
              placeholder="Ask about your sleep..."
              disabled={loading}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
            />
            <button
              onClick={handleSend}
              className="bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 transition"
            >
              {loading ? "Sending" : "Send"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}