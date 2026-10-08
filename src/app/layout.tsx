import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hi-Fi Delivery Service",
  description: "Delivery fees & daily cash flow",
  icons: { icon: "/logo.jpg" },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>);
}
