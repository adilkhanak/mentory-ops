import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { WebMcpTools } from "@/components/webmcp-tools";

export const metadata: Metadata = {
  title: "Mentory Ops — Tech Orda 2026",
  description: "Операционный контур отбора кандидатов Mentory",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}<WebMcpTools/><Toaster richColors position="top-right" /></body>
    </html>
  );
}
