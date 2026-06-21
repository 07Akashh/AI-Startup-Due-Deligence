# AI Startup Due Diligence Assistant 🔍🤖

A production-grade, staff-architect-level multi-agent RAG system built to ingest startup assets (PDF pitch decks, website URLs, and financial CSVs) and compile a rigorous, verified, and structured VC investment due diligence report in under 3 minutes.

---

## ─── System Architecture ───────────────────────────────

The application is structured as a **Turborepo monorepo** using workspaces to cleanly separate domain types, front-end presentation, and LLM orchestration logic.

```
startupai/
├── apps/
│   ├── frontend/         # Next.js 15 (App Router) — http://localhost:3000
│   └── backend/          # Node.js + Express + TypeScript — http://localhost:4000
├── packages/
│   └── shared/           # Common TypeScript interfaces & enums
├── package.json          # Turborepo root definitions
└── turbo.json            # Monorepo task pipeline
```

### High-Fidelity Data Flow

```mermaid
flowchart TD
    subgraph Client ["Client Interface (Next.js 15)"]
        UI[Upload Center Wizard] -->|Pitch Deck, URL, CSV| API[API Proxy]
        DASH[Analysis Dashboard] -->|Subscribe| SSE[Server-Sent Events Stream]
        REP[Due Diligence Dashboard]
    end

    subgraph Server ["Orchestration Layer (Express + TypeScript)"]
        API -->|POST /upload| UPLOAD[Multer + S3/R2 Service]
        API -->|POST /jobs| JOBS[Job Controller]
        JOBS -->|Initialize Job| DB[(PostgreSQL)]
        JOBS -->|Trigger Graph| GRAPH[LangGraph Engine]
        SSE -->|GET /stream/:id| EMITTER[Event Emitter Service]
    end

    subgraph Agents ["LangGraph Multi-Agent Pipeline"]
        GRAPH --> IN[Intake Agent]
        IN --> EX[Extraction Agent]
        EX --> KN[Knowledge Agent]
        KN --> RE[Reasoning Agent]
        RE --> VA[Validator Agent]
        VA -->|Validation Failure & Retry < 2| RE
        VA -->|Approved| AC[Action Agent]
    end

    subgraph Core ["Infrastructure & AI Integrations"]
        EX -->|Scrape| PUP[Puppeteer Scraper]
        EX -->|Parse PDF| PDF[pdf-parse + GPT-4o Vision]
        KN -->|Embed chunks| EMB[text-embedding-3-small]
        EMB -->|Vector Index| PC[(Pinecone Serverless)]
        RE -->|Parallel Section LLM| GPT4O[GPT-4o / GPT-4o-mini]
        AC -->|Persist Report| DB
    end

    AC -->|SSE complete| EMITTER
    EMITTER --> SSE
    REP -->|GET /report/:id| API
```

---

## ─── Multi-Agent Graph Orchestration ─────────────────

Our stateful orchestrator is constructed using **LangGraph** (`StateGraph`), enabling complex conditional transitions, dynamic feedback loops, and isolated local scopes:

| Agent Name | Engine / Tool | Local Agent Responsibility |
|---|---|---|
| **Intake Agent** | Express Service | Validates inputs (PDF ≤ 50MB, URL accessibility, structural schemas) and writes initial state to PostgreSQL. |
| **Extraction Agent** | Puppeteer & pdf-parse | Extracts clean Markdown from websites, parses pitch decks (with GPT-4o vision fallbacks on image-heavy pages), and formats financial CSV structures. |
| **Knowledge Agent** | text-embedding-3-small | Segments all raw data into 512-token chunks with 50-token sliding overlap, indexes vectors into custom Pinecone namespaces, and queriesTop-K matching contexts per section. |
| **Reasoning Agent** | GPT-4o & GPT-4o-mini | Executes 8 parallel context-grounded reasoning queries (fan-out design), tiering standard sections to `gpt-4o-mini` and complex metrics to `gpt-4o`. |
| **Validator Agent** | Zod Compliance | Critically evaluates report sections for compliance, range checks (investment scores between 0-100), and hallucination markers, triggering a re-route back to Reasoning if needed. |
| **Action Agent** | DB Service | Persists final data structures to PostgreSQL, emits final SSE states, and triggers Pinecone namespace deletions after a 48h TTL. |

---

## ─── Cost Optimization Mathematics ───────────────────

To achieve a production cost of **~$0.17 to $0.25 per startup report** (representing a **~88% savings** over typical naive full-context feeds), the system utilizes:

### 1. Model Tiering
Queries are split dynamically across models based on task complexity:
- **gpt-4o-mini** ($0.15/1M input): Startup Summary, Business Analysis, Market Opportunity, Strengths.
- **gpt-4o** ($2.50/1M input): Financial Insights, Severity-Mapped Risk Matrix, Rubric-based Attractiveness Scoring.

### 2. Fan-Out Context Retrieval
Instead of feeding full document texts, the **Knowledge Agent** queries the vector index namespace independently for each section. 
- Naive Prompt Token Cost: 40,000 tokens (full deck + website + CSV) $\times$ 8 LLM calls = **320,000 input tokens**.
- Fan-Out Prompt Token Cost: 2,000 tokens (query-targeted context) $\times$ 8 LLM calls = **16,000 input tokens** (**95% token reduction**).

### 3. OpenAI Prompt Caching
By keeping system instruction templates and header structures identical across all parallel reasoning queries, we trigger OpenAI's prompt caching discounts, providing a **50% savings** on prompt inputs.

---

## ─── Environmental Configuration ─────────────────────

Create `.env` in `apps/backend/` and `.env.local` in `apps/frontend/`.

### Backend Environment Variables (`apps/backend/.env`)
```env
PORT=4000
NODE_ENV=development

# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/startupai?schema=public"

# OpenAI
OPENAI_API_KEY="sk-..."

# Pinecone
PINECONE_API_KEY="pcsk-..."
PINECONE_INDEX_NAME="startupai-due-diligence"

# AWS S3 / Cloudflare R2 (Object Storage)
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"
AWS_BUCKET_NAME="startupai-assets"
# AWS_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com" # Optional Cloudflare R2 Override
```

### Frontend Environment Variables (`apps/frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

---

## ─── Setup & Local Launch Guide ──────────────────────

### 1. Prerequisites
- **Node.js**: `v20` or higher
- **PostgreSQL**: Local running database instance
- **Object Storage**: S3 bucket or Cloudflare R2 bucket
- **Pinecone**: Serverless index set to **1536 dimensions** with **Cosine Similarity** metric

### 2. Installation
From the monorepo root directory:
```bash
npm install
```

### 3. Generate Database Models & Push Schemas
Prisma translates schema types directly to PostgreSQL tables. Navigate to the backend directory:
```bash
cd apps/backend
npx prisma generate
npx prisma db push
```

### 4. Execute the Monorepo
Return to the monorepo root directory and boot up both backend and frontend dev servers concurrently:
```bash
cd ../..
npm run dev
```
- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:4000](http://localhost:4000)

---

## ─── Live Demo Instructions ──────────────────────────

1. **Access Upload wizard**: Navigate to [http://localhost:3000/upload](http://localhost:3000/upload).
2. **Step 1 (Pitch Deck)**: Drag and drop a startup pitch deck PDF (e.g. standard tech decks under 50MB).
3. **Step 2 (Website)**: Type in the startup's website URL (e.g. `stripe.com`).
4. **Step 3 (Financials)**: Attach a monthly financials CSV model.
5. **Step 4 (Launch)**: Review the files and click "🚀 Generate Report".
6. **Watch Real-Time Agents**: You will be redirected to `/analysis/[jobId]`. The SSE log viewer will print real-time events as each of the 6 agents completes its phase.
7. **Review Investment Insights**: Explore the completed due diligence report at `/analysis/[jobId]/report`. View the dynamic ScoreGauge, interactive financial bar charts, and print-ready formats.

---

## ─── Known Limitations & Future Roadmap ──────────────

### ⚠️ Known Limitations
- **PDF Extraction Constraints**: Scanning highly complex graphical vector maps (such as financial diagrams or dense schematic flowcharts) inside PDFs using `pdf-parse` can miss text markers, necessitating vision model overrides.
- **Cold-Start DB Ingress**: In development environments without connection pooling, raw PostgreSQL initialization handshakes can add up to 2 seconds of latency on new job creations.
- **Puppeteer Headless Scraping**: Dynamic Javascript-heavy pages behind complex Cloudflare Captcha gates can reject Puppeteer headless crawl attempts, falling back to a best-effort HTML download.

### 🚀 Future Roadmap
- **GraphRAG Semantic Mapping**: Introduce semantic linking across document namespaces to map structural connections between competitor filings and pitch deck claims.
- **tiktoken Dynamic Context Budgets**: Implement strict token calculation trimming on raw contexts prior to dispatch to prevent exceeding maximum context boundary limits.
- **Resend Email Integrations**: Deliver PDF due diligence summary attachments automatically to the user's registered inbox once the Action Agent completes.
