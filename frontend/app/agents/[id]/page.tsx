"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Agent = {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function AgentChat() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      fetch(`http://localhost:8000/agents/${id}`).then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      }),
      fetch(`http://localhost:8000/agents/${id}/messages`).then((r) => r.json()),
    ])
      .then(([agentData, msgData]) => {
        setAgent(agentData);
        setMessages(msgData);
      })
      .catch(() => router.push("/dashboard"));
  }, [id, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const text = input.trim();
    setMessages((prev) => [...prev, { id: "temp", role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`http://localhost:8000/agents/${id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      // Reload full message list to get real IDs from DB
      const msgs = await fetch(`http://localhost:8000/agents/${id}/messages`).then((r) => r.json());
      setMessages(msgs);
    } catch {
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== "temp"),
        { id: "err", role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function clearConversation() {
    setClearing(true);
    await fetch(`http://localhost:8000/agents/${id}/messages`, { method: "DELETE" });
    setMessages([]);
    setClearing(false);
  }

  if (!agent) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading agent...</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col h-[calc(100vh-49px)]">
      {/* Agent header */}
      <div className="border-b px-6 py-3 flex items-center justify-between gap-4 bg-gray-50">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard" className="text-gray-400 hover:text-black transition text-sm shrink-0">
            ← Back
          </Link>
          <div className="min-w-0">
            <h1 className="font-semibold truncate">{agent.name}</h1>
            <p className="text-xs text-gray-400 truncate">{agent.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/agents/${id}/edit`}
            className="text-xs border rounded-lg px-3 py-1.5 hover:bg-white transition"
          >
            Edit
          </Link>
          <button
            onClick={clearConversation}
            disabled={clearing || messages.length === 0}
            className="text-xs border border-red-200 text-red-400 rounded-lg px-3 py-1.5 hover:bg-red-50 transition disabled:opacity-40"
          >
            Clear chat
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="text-center mt-16 space-y-2">
            <p className="text-gray-400 text-sm">
              Start a conversation with <span className="font-medium text-gray-600">{agent.name}</span>
            </p>
            {agent.system_prompt && (
              <p className="text-xs text-gray-300 max-w-sm mx-auto">{agent.system_prompt}</p>
            )}
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={msg.id ?? i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === "user"
                  ? "bg-black text-white rounded-br-sm"
                  : "bg-gray-100 text-gray-800 rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-gray-400">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="border-t px-6 py-4 flex gap-3 items-end bg-white">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage(e as unknown as React.FormEvent);
            }
          }}
          placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
          rows={1}
          className="flex-1 border rounded-xl px-4 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-black text-white px-4 py-2 rounded-xl text-sm hover:bg-gray-800 transition disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </main>
  );
}
