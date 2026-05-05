import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import KiteToaster from "@/components/ui/kite-toaster";
import { themeBootScript } from "@/lib/theme";

export const metadata: Metadata = {
  title: {
    default: "KITEHUB",
    template: "%s · KITEHUB",
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Theme boot guard in <head> — runs before paint to prevent FOUC.
            Must live here: React 19 warns about <script> in <body> render tree. */}
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <KiteToaster />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
