import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Laudwall", template: "%s · Laudwall" },
  description: "Open-source testimonial wall. Collect, approve and embed social proof. API and MCP server for AI agents.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
