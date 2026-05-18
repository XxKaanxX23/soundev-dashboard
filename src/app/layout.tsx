import type { Metadata } from "next";
import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Soundev Analytics",
  description: "Private analytics dashboard prototype for Drum Mastery Suite.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body
        className="min-h-full bg-sd-void text-sd-text"
        suppressHydrationWarning
      >
        <Sidebar />
        <div className="min-h-screen md:pl-64">
          <Header />
          <main className="px-4 py-5 md:px-6 md:py-7">{children}</main>
        </div>
      </body>
    </html>
  );
}
