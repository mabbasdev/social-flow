import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ClerkProvider } from "@clerk/nextjs";
import { QueryProvider } from "@/components/query-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SocialFlow — AI Social Media Scheduler & Content Planner",
  description: "Automate, plan, and schedule your social media posts across multi-channels with AI generation and visual calendar planning.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.className} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
      style={
        {
          "--font-sans": geistSans.style.fontFamily,
          "--font-mono": geistMono.style.fontFamily,
        } as React.CSSProperties
      }
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider>
          <QueryProvider>

            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem
              disableTransitionOnChange
            >
              <TooltipProvider>{children}</TooltipProvider>
            </ThemeProvider>
          </QueryProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
