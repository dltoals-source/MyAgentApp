import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyAgentApp",
  description: "Build your own AI agents, no coding required",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900">
        <nav className="border-b px-6 py-3 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg tracking-tight hover:opacity-70 transition">
            MyAgentApp
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 hover:text-black transition"
          >
            My Agents
          </Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
