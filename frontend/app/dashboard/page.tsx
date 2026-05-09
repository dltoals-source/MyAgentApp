"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Agent = {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
};

export default function Dashboard() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchAgents() {
    const res = await fetch("http://localhost:8000/agents");
    const data = await res.json();
    setAgents(data);
    setLoading(false);
  }

  async function deleteAgent(id: string) {
    await fetch(`http://localhost:8000/agents/${id}`, { method: "DELETE" });
    setAgents((prev) => prev.filter((a) => a.id !== id));
  }

  useEffect(() => {
    fetchAgents();
  }, []);

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">My Agents</h1>
          {!loading && (
            <p className="text-sm text-gray-400 mt-1">
              {agents.length === 0 ? "No agents yet" : `${agents.length} agent${agents.length !== 1 ? "s" : ""}`}
            </p>
          )}
        </div>
        <Link
          href="/agents/new"
          className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition text-sm"
        >
          + New Agent
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading agents...</p>
      ) : agents.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-xl">
          <p className="text-gray-400 mb-4">You have no agents yet.</p>
          <Link
            href="/agents/new"
            className="bg-black text-white px-5 py-2.5 rounded-lg hover:bg-gray-800 transition text-sm"
          >
            Create your first agent
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="border rounded-xl p-5 flex flex-col gap-3 hover:shadow-sm transition"
            >
              <div>
                <h2 className="text-lg font-semibold">{agent.name}</h2>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{agent.description}</p>
                {agent.system_prompt && (
                  <p className="text-xs text-gray-300 mt-2 line-clamp-1 italic">
                    {agent.system_prompt}
                  </p>
                )}
              </div>
              <div className="flex gap-2 mt-auto pt-2 border-t">
                <button
                  onClick={() => router.push(`/agents/${agent.id}`)}
                  className="flex-1 bg-black text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-800 transition"
                >
                  Chat
                </button>
                <button
                  onClick={() => router.push(`/agents/${agent.id}/edit`)}
                  className="px-3 py-2 rounded-lg text-sm border hover:bg-gray-50 transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteAgent(agent.id)}
                  className="px-3 py-2 rounded-lg text-sm border border-red-200 text-red-500 hover:bg-red-50 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
