/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warm paper and ink: an editor's desk, not a SaaS dashboard.
        paper: {
          DEFAULT: "#F5F1E8", // warm off-white page
          raised: "#FBF8F1",  // slightly lighter card surface
          sunk: "#EDE7D8",    // inset wells / code blocks
        },
        ink: {
          DEFAULT: "#16130F", // warm near-black text
          soft: "#3A342B",    // secondary text
          faint: "#6B6355",   // muted / captions
          rule: "#221E17",    // hairline rules on dark
        },
        vermilion: {
          DEFAULT: "#E4491C", // the editor's red pen (primary accent)
          deep: "#C43B18",
        },
        // Functional verdict palette.
        accept: "#1F7A4D",
        partial: "#C67A12",
        reject: "#C43B18",
        structure: "#2B3A55", // ink-blue for structural links
      },
      fontFamily: {
        serif: ['"Newsreader"', 'Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        sans: ['"Inter"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "3px",
        md: "4px",
      },
      maxWidth: {
        page: "1440px",
      },
      keyframes: {
        stampin: {
          "0%": { opacity: "0", transform: "scale(1.15) rotate(-4deg)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(-2deg)" },
        },
        fadeup: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        stampin: "stampin 240ms ease-out",
        fadeup: "fadeup 260ms ease-out",
      },
    },
  },
  plugins: [],
};
