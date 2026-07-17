# Frontend Development Rules: React & Tailwind

## Tech Stack & Execution Environment
- Environment: React 18+ bootstrapped with Vite.
- Styling Library: Tailwind CSS (Utility-first styling only; do not write custom raw CSS blocks).
- State Control: Standard React Hooks (`useState`, `useEffect`, `useMemo`). Keep complex global states out unless absolutely required; rely on an event-driven flow from the SSE endpoint.

## UI Layout Guidelines
- The application is an industrial, military-grade operational control console, not a commercial marketplace. Use dark slate backgrounds (`bg-slate-900`), crisp borders, neon status indicators (emerald for clear, amber for medium warning, crimson for critical breaches).
- The display must be split into a 3-column operational layout:
  1. Live Incident Intake Stream (Chronological cards showing real-time priority updates).
  2. AI Deep-Dive & Action Console (Displays the active incident, the Gemini analytical summary, and auto-generated action points).
  3. Resource Allocation Grid & Metrics (Live counts of available staff, sector-wise incident volume heatmaps via simple styled CSS grids).
- Never render raw broken links or unformatted placeholder pages. Maintain continuous responsive layout integrity.