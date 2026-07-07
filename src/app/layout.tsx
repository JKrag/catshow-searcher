import type { Metadata } from "next";
import { Space_Grotesk, Crimson_Pro } from "next/font/google";
import { PersonaNav } from "@/components/PersonaNav";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
});

const crimsonPro = Crimson_Pro({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Catz — find a cat show",
  description:
    "Combined calendar and map of FIFe and TICA cat shows, with driving distance from your home.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${crimsonPro.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PersonaNav />
        {children}
      </body>
    </html>
  );
}
