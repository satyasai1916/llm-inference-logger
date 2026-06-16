# LLM Inference Logger

A multi-provider LLM chat application with real-time streaming and an inference logging dashboard. Built with **Next.js 15**, **Prisma**, and **SQLite** (Postgres-ready for production).

Track latency, token usage, error rates, and cost across **Google Gemini**, **xAI Grok**, and **Anthropic Claude** — all from one UI.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748)

## Features

- **Multi-provider chat** — Gemini, Grok (`grok-4.3`), and Claude (when configured)
- **Streaming responses** — Server-Sent Events with token batching and abort support
- **Inference logging** — Every request logs latency, tokens, TTFT, cost, and PII-redacted previews
- **Metrics dashboard** — Summary cards, latency charts, token usage, and provider breakdown
- **Conversation management** — Create, delete, export (JSON/TXT), and cancel in-flight streams
- **Provider gating** — Only providers with valid API keys appear in the UI

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | SQLite (dev) / PostgreSQL (prod) via Prisma |
| Styling | Tailwind CSS |
| Charts | Recharts |
| LLM SDKs | `@google/generative-ai`, `@anthropic-ai/sdk`, xAI REST API |

## Quick Start

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
git clone https://github.com/satyasai1916/llm-inference-logger.git
cd llm-inference-logger

cp .env.example .env
# Edit .env with your API keys

npm install
npx prisma generate
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Using Make

```bash
make install
make db-push
make dev
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your keys:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | `file:./dev.db` for SQLite dev |
| `GEMINI_API_KEY` | For Gemini | [Google AI Studio](https://aistudio.google.com/apikey) |
| `GROK_API_KEY` | For Grok | [xAI Console](https://console.x.ai) |
| `ANTHROPIC_API_KEY` | For Claude | [Anthropic Console](https://console.anthropic.com) |
| `CLAUDE_MODE` | No | `sdk` (default) or `bedrock` |
| `BASE_URL` | Yes | `http://localhost:3000` — used for internal ingest dispatch |

> **Note:** Claude only appears in the provider picker when `ANTHROPIC_API_KEY` (or Bedrock credentials) is set. Grok requires active API credits on your [xAI team](https://console.x.ai).

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Conversation list
│   ├── chat/[id]/page.tsx    # Streaming chat UI
│   ├── dashboard/page.tsx    # Metrics dashboard
│   └── api/v1/
│       ├── conversations/    # CRUD + SSE stream
│       ├── ingest/           # Inference log ingestion
│       ├── metrics/          # Dashboard data
│       └── providers/        # Available providers (key-gated)
├── lib/
│   ├── llm/                  # Provider adapters + client
│   ├── api.ts                # Frontend API client
│   └── sse.ts                # SSE stream parser
└── types/                    # Shared TypeScript types
prisma/
└── schema.prisma             # Conversations, messages, inference_logs
```

## API Overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/health` | GET | Health + DB connectivity |
| `/api/v1/providers` | GET | Configured providers & models |
| `/api/v1/conversations` | GET, POST | List / create conversations |
| `/api/v1/conversations/:id/stream` | POST | Stream assistant response (SSE) |
| `/api/v1/ingest` | POST | Log inference metadata |
| `/api/v1/metrics/summary` | GET | Aggregated stats (`?window=1h\|24h\|7d`) |
| `/api/v1/metrics/latency-over-time` | GET | Latency time series |
| `/api/v1/metrics/tokens-over-time` | GET | Token usage time series |
| `/api/v1/metrics/provider-breakdown` | GET | Per-provider stats |

## Docker

```bash
docker build -t llm-inference-logger .
docker run -p 3000:3000 --env-file .env llm-inference-logger
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:migrate` | Run Prisma migrations |

## License

MIT
