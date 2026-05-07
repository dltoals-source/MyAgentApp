import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyAgentApp",
  description: "Build your own AI agents, no coding required",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
