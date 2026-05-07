import Link from "next/link";

export default function Dashboard() {
  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">My Agents</h1>
        <Link
          href="/agents/new"
          className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
        >
          + New Agent
        </Link>
      </div>
      <p className="text-gray-500">You have no agents yet. Create your first one!</p>
    </main>
  );
}
