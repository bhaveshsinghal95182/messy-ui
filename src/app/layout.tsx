import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";
import DocsLayout from "@/components/layout/docs-layout";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://messyui.dev"),
  title:
    "messy-ui - Beautiful React Components powered by Framer Motion and GSAP",
  description:
    "A collection of animated, accessible React components built with GSAP and Framer Motion for teams that value performance and accessibility.",
  icons: {
    icon: [
      { url: "/favicon_io/favicon.ico", sizes: "any" },
      { url: "/favicon_io/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon_io/favicon-32x32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [
      { url: "/favicon_io/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/favicon_io/site.webmanifest",
  authors: [
    {
      name: "Bhavesh Singhal",
      url: "https://github.com/bhaveshsinghal95182",
    },
  ],
  creator: "Bhavesh Singhal",
  publisher: "Bhavesh Singhal",
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/en-US",
      "ar-EG": "/ar-EG",
    },
  },
  openGraph: {
    title:
      "messy-ui - Beautiful React Components powered by Framer Motion and GSAP",
    description:
      "A collection of animated, accessible React components built with GSAP and Framer Motion for teams that value performance and accessibility.",
    type: "website",
    url: "https://messyui.dev",
    siteName: "messy-ui",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "messy-ui - Beautiful React Components powered by Framer Motion and GSAP",
      },
    ],
  },
  robots: {
    follow: true,
    index: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: ["400"],
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DocsLayout>{children}</DocsLayout>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
