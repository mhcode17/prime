import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trucking CRM",
  description: "Driver management, e-sign, screening, and onboarding for carriers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
