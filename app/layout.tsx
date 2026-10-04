import type { Metadata, Viewport } from "next"
import { Outfit } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { SpeedInsights } from "@vercel/speed-insights/next"

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
})

export const metadata: Metadata = {
  title: "swypejobs - Swipe Right on Your Dream Career",
  description:
    "The Tinder-style job platform connecting students and recruiters through mutual swipe-based matching, real-time chat, and community channels.",
  openGraph: {
    title: "swypejobs - Swipe Right on Your Dream Career",
    description:
      "Swipe on jobs. Match with recruiters. Chat directly. No cold emails. No ghosting.",
    type: "website",
  },
  icons: { icon: "data:," },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1e3a5f",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${outfit.variable} antialiased bg-background text-foreground font-sans selection:bg-primary/15`}
      >
        <Providers>{children}</Providers>
        <SpeedInsights />
      </body>
    </html>
  )
}
