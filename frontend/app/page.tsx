import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">MyAgentApp</h1>
      <p className="text-lg text-gray-600 mb-8 text-center max-w-md">
        Build your own AI agents — no coding required.
      </p>
      <Link
        href="/dashboard"
        className="bg-black text-white px-6 py-3 rounded-lg text-lg hover:bg-gray-800 transition"
      >
        Get Started
      </Link>
    </main>
  );
}
