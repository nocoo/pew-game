import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = { themeColor: "#191714" };

export const metadata: Metadata = {
  icons: {
    icon: { url: "/icon.png", type: "image/png", sizes: "32x32" },
    apple: "/apple-touch-icon.png",
  },
  title: "Pew Game — Prairie Shooter",
  description: "Three lives. Endless waves. A pocket-sized pixel western with an all-time leaderboard. Play Pew Game in your browser.",
  metadataBase: new URL("https://pew.hexly.ai"),
  openGraph: {
    title: "Pew Game — Prairie Shooter",
    description: "A little wild. A lot of pew. Make your name on the prairie.",
    url: "https://pew.hexly.ai",
    images: [{ url: "/logo-512.png", width: 512, height: 512, alt: "Pew Game joystick" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
