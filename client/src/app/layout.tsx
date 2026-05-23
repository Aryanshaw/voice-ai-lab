import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { DevtoolsProvider } from "@/providers/DevtoolsProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { AppSidebar } from "@/components/AppSidebar";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Voice Agent Lab",
  description: "Configure and test AI voice agents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <DevtoolsProvider>
              {/* Sidebar + content layout — full viewport height, no scroll on root */}
              <div className="flex h-screen overflow-hidden">
                <AppSidebar />
                {/* overflow-hidden — each page manages its own scroll */}
                <main className="flex flex-1 flex-col overflow-hidden bg-background">
                  {children}
                </main>
              </div>
            </DevtoolsProvider>
          </QueryProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
