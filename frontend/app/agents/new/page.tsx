"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewAgent() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("http://localhost:8000/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    if (res.ok) router.push("/dashboard");
  }

  return (
    <main className="min-h-screen p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create a New Agent</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Agent Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My Schedule Agent"
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">What does this agent do?</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Helps me manage my daily schedule and reminds me of important tasks"
            className="w-full border rounded-lg px-4 py-2 h-32 focus:outline-none focus:ring-2 focus:ring-black"
            required
          />
        </div>
        <button
          type="submit"
          className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition"
        >
          Create Agent
        </button>
      </form>
    </main>
  );
}
