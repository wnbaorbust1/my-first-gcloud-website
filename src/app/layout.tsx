import type { Metadata } from "next";
import { Caveat, Fraunces, Inter, Kalam } from "next/font/google";

import { AuthProvider } from "@/components/providers/auth-provider";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

/**
 * Worksheet typography — used only on the two "printable vision board"
 * outputs (Assessment Results, Blueprint Scorecard) that a member gets
 * after finishing the quiz, per the hand-drawn worksheet reference the
 * business owner provided. Scoped to those pages via their own classes,
 * not applied app-wide — the rest of Blueprint keeps Fraunces/Inter.
 */
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const kalam = Kalam({
  variable: "--font-kalam",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Blueprint — From Passion to Power to Legacy™",
  description:
    "Blueprint is the Business Growth OS that shows you where your business stands today, and exactly what to build next — from Passion to Power to Legacy.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${caveat.variable} ${kalam.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
