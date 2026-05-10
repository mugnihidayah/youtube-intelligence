import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "YouTube Intelligence — Creator Economy Analytics",
  description: "Real-time analytics dashboard for YouTube Creator Economy across Gaming, Tech, Education, and Music niches",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </body>
    </html>
  );
}
