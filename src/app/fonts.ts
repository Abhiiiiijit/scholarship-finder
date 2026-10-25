import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Devanagari } from "next/font/google";

// Shared by the student and admin root layouts.
export const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// Hindi and Marathi. Not preloaded: the browser fetches it only when Devanagari text is on screen,
// so English pages stay as light as before.
export const plexDevanagari = IBM_Plex_Sans_Devanagari({
  variable: "--font-plex-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "500", "600"],
  preload: false,
});

export const fontClasses = `${plexSans.variable} ${plexMono.variable} ${plexDevanagari.variable}`;
