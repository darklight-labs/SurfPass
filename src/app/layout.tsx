import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/app-providers";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "SurfPass",
  description:
    "Satellite pass forecasting, coordination, and alerting for operators and spotters.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full font-sans antialiased">
      <body className="min-h-full bg-background text-foreground">
        <AppProviders>
          {children}
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
