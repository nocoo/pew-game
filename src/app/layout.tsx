import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  icons: {
    icon: { url: "/icon.png", type: "image/png", sizes: "32x32" },
    apple: "/apple-touch-icon.png",
  },
  title: "Pew.md — Prairie Shooter",
  description: "A pixel art twin-stick shooter inspired by Journey of the Prairie King",
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
