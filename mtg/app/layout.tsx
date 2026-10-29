import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Cinzel, Inter, Geist_Mono, Rajdhani } from "next/font/google";
import "mana-font/css/mana.css";
import "./globals.css";
import UserBar from "./UserBar";
import RegisterSW from "./RegisterSW";
import AutoFullscreen from "./AutoFullscreen";
import Music from "./Music";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";

// Inter: made for reading text on screens, clear at small sizes.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Atkinson Hyperlegible Next: drawn so that similar letters (I, l, 1, O, 0) stay clearly different. Used for text in dark mode, where thin text on a dark page is hardest to read.
const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  display: "swap",
});

// Rajdhani: a crisp, slightly squared game-interface face for labels, names and numbers.
const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

// Cinzel: a classical, engraved-looking serif for the game's name on the home page.
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["600", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DuelRealm MTG",
  description: "A two-player card duel game. Build a deck, join a room and play.",
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }], shortcut: "/icon.svg", apple: "/logo.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${inter.variable} ${atkinson.variable} ${rajdhani.variable} ${cinzel.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        {/* Open the connections to the card picture hosts early, so the first picture does not wait for them. */}
        <link rel="preconnect" href="https://cards.scryfall.io" crossOrigin="" />
        {process.env.NEXT_PUBLIC_SUPABASE_URL && <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} crossOrigin="" />}
      </head>
      <body className="min-h-full flex flex-col">
        <RegisterSW />
        <AutoFullscreen />
        <Music />
        <UserBar />
        {children}
      </body>
    </html>
  );
}
