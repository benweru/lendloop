import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "LendLoop: Borrow what you need. Lend what you don't.",
  description: "A neighborhood tool-lending board.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
