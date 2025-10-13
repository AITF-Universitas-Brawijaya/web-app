# PRD Analyst

Analyst dashboard to review and triage content detection results. Built with Next.js (App Router), React + TypeScript, TailwindCSS and includes a small chat assistant backed by Google Gemini / Vercel AI.

## Deployment
Go to: [https://prd-analyst.vercel.app](https://prd-analyst.vercel.app)

## Key files
- `app/layout.tsx`, `app/page.tsx` — main UI and pages
- `app/api/analyze/route.ts` — chat assistant API route (calls Gemini SDK / fallback)
- `components/ui/*` — UI primitives
- `styles/globals.css` — Tailwind entry

## v1 notes:
- The project includes a few fallback mechanisms for working with Gemini (temporary LLM provider):
- Primary: @google/generative-ai SDK usage in app/api/analyze/route.ts
- Fallback: dynamic generateText from the ai package (used when the SDK response lacks expected fields)
  - The assistant prompt instructs the model to return Markdown-formatted answers.
  - The frontend sanitizes and renders Markdown using react-markdown + remark-gfm.
- Note: Gemini is a temporary setup — it will later be replaced with Mistral as the generic LLM provider.
