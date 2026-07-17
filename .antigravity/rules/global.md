# Global Rules for Project: FIFA 2026 CommandCenter AI

## Architectural Context
- Target Audience: World Cup Stadium Organizers & Venue Operations Staff.
- Mission: Intake chaotic real-time incident reports, prioritize them with GenAI reasoning, match against available staff resources, and dispatch automated solutions.
- Time Limit: 20-Hour Hackathon build. Code must be highly modular, zero-fluff, and immediate production-viable.

## Code & Environment Enforcement
- DO NOT install global dependencies without verifying inside package.json or requirements.txt first.
- NEVER use external cloud databases or multi-step cloud authentication. Default to SQLite (`stadium.db`) for all storage needs.
- Keep the code readable and lightweight. Avoid heavy visual asset assets (images, videos, fonts) to keep repository size strictly under 10 MB. Use Lucide React for icons.
- All code files must use standard formatting, proper asynchronous paradigms (`async/await` in JavaScript, `async def` in Python), and descriptive inline naming protocols.