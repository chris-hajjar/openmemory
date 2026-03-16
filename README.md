# openmemory

A personal persistent memory server for MCP clients (Claude Desktop, Cursor, etc.). Store notes, tasks, finances, contacts, and more — queryable by any AI assistant you use.

Built on Next.js + Supabase, deployed on Vercel, secured with Google OAuth.

## How it works

MCP clients connect to your deployed URL. On first connect, a browser window opens for Google sign-in. After that, your AI assistant has access to 7 memory tables it can read and write using natural language.

```
Claude: "Save a note that the Milo API key rotates every 90 days"
Claude: "What tasks do I have open for the TradingBot project?"
Claude: "Log a $450 expense for AWS, category: infrastructure"
```

## Tools

| Tool | Description |
|------|-------------|
| `list_tables` | List available tables |
| `get_table_schema` | Get columns for a table |
| `save_record` | Insert a new record |
| `read_records` | Query with optional filters |
| `update_record` | Update by ID |
| `delete_record` | Delete by ID |
| `search_records` | Full-text search |

## Tables

| Table | Purpose |
|-------|---------|
| `memories` | General notes and things to remember |
| `tasks` | Personal to-dos and life admin |
| `projects` | Tech projects and software initiatives |
| `finances` | Income and expense tracking |
| `portfolio_notes` | Trading ideas and stock research |
| `schedule` | Events and important dates |
| `tax_records` | Tax documents and deductions |
| `contacts` | People and companies |

## Deploy your own

### 1. Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run all migration files in [`migrations/`](migrations/) in order (001 → 004) in the SQL editor
4. Copy your project URL and service role key (Settings → API)

### 2. Google OAuth

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → New Project
2. APIs & Services → OAuth consent screen → External → add yourself as a test user
3. APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web application)
4. Add authorized redirect URI: `https://your-app.vercel.app/api/oauth/callback`
5. Copy Client ID and Client Secret

### 3. Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/chris-hajjar/openmemory)

Set these environment variables:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `ALLOWED_EMAILS` | Comma-separated list of allowed Google emails |
| `SESSION_SECRET` | Random secret: `openssl rand -hex 32` |
| `NEXTAUTH_URL` | Your Vercel deployment URL (no trailing slash) |

### 4. Connect

**Claude Desktop** — Settings → Developer → Add custom connector:
```
https://your-app.vercel.app/api/mcp
```

**Claude Code CLI:**
```bash
claude mcp add --transport http openmemory https://your-app.vercel.app/api/mcp
```

A browser window will open for Google sign-in on first connect.

## Adding tables

1. Add a new SQL migration with your table (must include `fts tsvector` column and trigger — see existing migrations as reference)
2. Add the table name to `ALLOWED_TABLES` in [`lib/tools.ts`](lib/tools.ts)
3. Add a description to `TABLE_DESCRIPTIONS` in the same file
4. Deploy

## Security

- All access requires a valid Google-authenticated token
- Email allowlist (`ALLOWED_EMAILS`) controls who can authenticate
- PKCE (S256) enforced on all OAuth flows
- Tokens expire after 24 hours, refresh tokens after 30 days
- Service role key never leaves the server
