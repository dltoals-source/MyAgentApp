"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const PRESETS = [
  {
    label: "Customer Support",
    system_prompt:
      "You are a friendly and professional customer support agent. Always be polite, empathetic, and solution-oriented. If you don't know the answer, acknowledge it and offer to escalate.",
  },
  {
    label: "Research Assistant",
    system_prompt:
      "You are a thorough research assistant. Break down complex topics clearly, provide balanced perspectives, and always clarify when something is uncertain or outside your knowledge.",
  },
  {
    label: "Writing Coach",
    system_prompt:
      "You are an encouraging writing coach. Help users improve their writing by giving specific, actionable feedback on clarity, structure, and tone. Celebrate progress and be constructive.",
  },
  {
    label: "Code Helper",
    system_prompt:
      "You are a patient coding assistant. Explain concepts clearly, walk through problems step by step, and always include working code examples. Ask clarifying questions before diving in.",
  },
];

export default function EditAgent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`http://localhost:8000/agents/${id}`)
      .then((r) => {
        if (!r.ok) router.push("/dashboard");
        return r.json();
      })
      .then((agent) => {
        setName(agent.name);
        setDescription(agent.description);
        setSystemPrompt(agent.system_prompt ?? "");
        setLoading(false);
      })
      .catch(() => router.push("/dashboard"));
  }, [id, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`http://localhost:8000/agents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, system_prompt: systemPrompt }),
    });
    if (res.ok) router.push("/dashboard");
    else setSaving(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading agent...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Agent</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium mb-1">Agent Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">What does this agent do?</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded-lg px-4 py-2 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-black"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Personality &amp; Instructions
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setSystemPrompt(p.system_prompt)}
                className="text-xs border rounded-full px-3 py-1 hover:bg-black hover:text-white transition"
              >
                {p.label}
              </button>
            ))}
          </div>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Describe how your agent should behave..."
            className="w-full border rounded-lg px-4 py-2 h-36 resize-none focus:outline-none focus:ring-2 focus:ring-black text-sm"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 border rounded-lg px-4 py-3 hover:bg-gray-50 transition text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-black text-white rounded-lg px-4 py-3 hover:bg-gray-800 transition text-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </main>
  );
}
