# agents.md - AI Agent Guidelines for BTC Stacker

This document provides context and guidelines for AI agents working on this codebase.

## Project Overview

BTC Stacker is a Next.js web application for automated Bitcoin accumulation using the Bitaroo Exchange API. It implements multiple proven buying strategies (DCA, Value Averaging, Moving Average, RSI) to help users maximize their Bitcoin holdings over time.

**Key Principle:** This is a buy-only application. It should NEVER sell Bitcoin or withdraw funds.

## Architecture

### Frontend (Next.js App Router)
- `/app` - Pages and API routes using Next.js 14+ App Router
- `/components` - React components (dashboard, UI primitives)
- Client-side state management via React hooks and localStorage

### Backend (API Routes + Convex)
- `/app/api/*` - Next.js API routes that proxy to Bitaroo
- `/convex/*` - Database schema and server functions
- All sensitive operations happen server-side

### Core Libraries (`/lib`)
- `bitaroo.ts` - Typed Bitaroo API client
- `crypto.ts` - AES-256-GCM encryption for API keys
- `market-data.ts` - Price fetching and technical indicators
- `strategies/*` - Strategy implementations

## Coding Guidelines

### TypeScript
- Use strict TypeScript throughout
- Define interfaces for all data structures
- Use `export type` for type-only exports (required by isolatedModules)

### API Security
- Never log API keys or secrets
- Always encrypt sensitive data before storage
- Validate all inputs with Zod
- Use `error.issues` (not `error.errors`) for ZodError

### Strategies
- All strategies return `{ amountAUD, shouldBuy, reason }`
- Strategies should be pure functions when possible
- Market data is passed in, not fetched internally

### Components
- Use Tailwind CSS for styling
- Follow the existing dark theme (gray-900, gray-800, orange-500)
- Components should be self-contained with clear props interfaces

## Common Tasks

### Adding a New Strategy

1. Create `/lib/strategies/new-strategy.ts`:
```typescript
export interface NewStrategyConfig {
  // config fields
}

export interface NewStrategyResult {
  amountAUD: number;
  reason: string;
  // additional fields
}

export function calculateNewStrategy(
  config: NewStrategyConfig,
  marketData: MarketData
): NewStrategyResult {
  // implementation
}
```

2. Add to `/lib/strategies/index.ts`:
- Add to `StrategyType` union
- Add case to `executeStrategy` switch
- Export config type

3. Update UI in `/components/dashboard/strategy-card.tsx`

### Adding a New API Endpoint

1. Create route file in `/app/api/[path]/route.ts`
2. Use Zod for request validation
3. Get encrypted API key from `X-Encrypted-Api-Key` header
4. Decrypt with `decrypt()` from `@/lib/crypto`
5. Use `createBitarooClient()` for Bitaroo operations

### Modifying Database Schema

1. Update `/convex/schema.ts`
2. Add/modify functions in corresponding `/convex/*.ts` files
3. Run `npx convex dev` to sync

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `ENCRYPTION_KEY` | 64-char hex for AES-256 encryption | Yes |
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL | Yes |
| `CRON_SECRET` | Auth for cron endpoint | For scheduled jobs |

## Testing Considerations

- The app connects to real Bitaroo API - use small amounts for testing
- Market data falls back to CoinGecko if no API key provided
- Strategies can be tested with `dryRun: true` parameter

## Security Reminders

1. **Never** add sell or withdraw functionality
2. **Never** log decrypted API keys
3. **Never** store unencrypted secrets
4. **Always** validate user input
5. **Always** use HTTPS in production

## Dependencies

Key packages to be aware of:
- `convex` - Real-time database
- `zod` - Schema validation
- `cron-parser` - Cron expression parsing (use `CronExpressionParser.parse()`)
- `lucide-react` - Icons

## Excluded from TypeScript Build

The `/convex` folder is excluded from the main TypeScript build because it requires Convex-generated types. Run `npx convex dev` to generate these types.
