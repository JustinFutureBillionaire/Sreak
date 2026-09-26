import type { Metadata } from "next";
import { Bagel_Fat_One, Nunito } from "next/font/google";
import "./globals.css";

const bagel = Bagel_Fat_One({ variable: "--font-bagel", weight: "400", subsets: ["latin"] });
const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sreak",
  description: "Speak and Break — talk your way past a guard, win over investors. Every line is judged live.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bagel.variable} ${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
