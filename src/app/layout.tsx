import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FamiliHub",
  description: "Private family hub for tasks, members, and secure coordination.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
