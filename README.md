# BTC Stacker

Automated Bitcoin accumulation app for Bitaroo Exchange using proven, backtested strategies.

## Features

- **4 Accumulation Strategies:**
  - Dollar Cost Averaging (DCA) - Fixed amount at regular intervals
  - Value Averaging - Adjust purchases to meet target portfolio growth
  - 200-Day Moving Average - Buy more when price is below the MA
  - RSI Strategy - Increase purchases when oversold

- **Bitaroo Integration:** Direct API connection to Australia's Bitcoin exchange
- **Secure:** API keys encrypted with AES-256-GCM, stored locally
- **Buy-Only:** Cannot sell or withdraw - your Bitcoin stays safe
- **Scheduled & Manual:** Automate purchases or execute on-demand

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env.local` file:

```bash
# Generate a 64-character hex key for encryption
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Convex database URL (get from convex.dev)
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud

# Secret for cron job authentication
CRON_SECRET=$(openssl rand -hex 16)
```

### 3. Set Up Convex Database

```bash
npx convex dev
```

Follow the prompts to create a new Convex project or link an existing one.

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Connect Bitaroo

1. Log in to [trade.bitaroo.com.au](https://trade.bitaroo.com.au)
2. Go to Account → API Keys
3. Generate a new API key with read + trade permissions
4. Enter your Key ID and Secret in the app's Settings page

## Strategies Explained

### Dollar Cost Averaging (DCA)

The simplest strategy. Buy a fixed AUD amount at regular intervals regardless of price.

**Best for:** Beginners, passive investors, reducing timing risk

**Config:**
- Amount (AUD): How much to buy each time
- Frequency: Daily, weekly, or monthly

### Value Averaging

Dynamically adjusts purchase amounts to meet a target portfolio growth rate. Buys more when prices drop, less when prices rise.

**Best for:** Active investors who want to optimize entry prices

**Config:**
- Target Growth (AUD): Desired portfolio increase per period
- Frequency: Daily, weekly, or monthly

### 200-Day Moving Average

Applies a multiplier when Bitcoin's price is below its 200-day moving average - a historically bullish signal.

**Best for:** Technical traders, accumulating during dips

**Config:**
- Base Amount (AUD): Standard purchase amount
- Multiplier: Factor when below MA (e.g., 2x means double purchases)

### RSI Strategy

Uses the Relative Strength Index to identify oversold conditions and increase purchases accordingly.

**Best for:** Technical traders, buying fear

**Config:**
- Base Amount (AUD): Standard purchase amount
- RSI Thresholds: Multipliers for different RSI levels
  - Below 30: Extreme oversold (default 2x)
  - Below 40: Oversold (default 1.5x)
  - Below 50: Mild oversold (default 1.2x)

## Project Structure

```
├── app/
│   ├── api/                 # API routes
│   │   ├── bitaroo/         # Bitaroo proxy endpoints
│   │   ├── strategies/      # Strategy execution
│   │   ├── cron/            # Scheduled job handler
│   │   └── settings/        # API key management
│   ├── dashboard/           # Dashboard pages
│   └── page.tsx             # Landing page
├── components/
│   ├── dashboard/           # Dashboard components
│   └── ui/                  # Base UI components
├── convex/                  # Database schema & functions
├── lib/
│   ├── bitaroo.ts           # Bitaroo API client
│   ├── crypto.ts            # Encryption utilities
│   ├── market-data.ts       # Price & indicator fetching
│   ├── scheduler.ts         # Cron utilities
│   └── strategies/          # Strategy implementations
└── public/                  # Static assets
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/bitaroo/balance` | GET | Fetch AUD/BTC balances |
| `/api/bitaroo/orders` | GET/POST/DELETE | Manage orders |
| `/api/bitaroo/market` | GET | Get price and indicators |
| `/api/strategies/execute` | POST | Execute a strategy |
| `/api/cron` | GET | Scheduled job endpoint |
| `/api/settings` | POST | Save/test API keys |

## Security

- **Encryption:** API keys are encrypted using AES-256-GCM before storage
- **Local Storage:** Keys are stored in your browser, never on external servers
- **Buy-Only:** The app only executes buy orders - it cannot sell or withdraw
- **No Withdrawal Permissions:** When creating your Bitaroo API key, do NOT enable withdrawal permissions

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

For scheduled jobs, add a Vercel Cron in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 9 * * *"
    }
  ]
}
```

### Self-Hosted

Build and run:

```bash
npm run build
npm start
```

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Database:** Convex
- **Styling:** Tailwind CSS
- **Icons:** Lucide React

## Disclaimer

This software is for educational purposes only. Cryptocurrency trading carries significant risk. Past performance of any strategy does not guarantee future results. Always do your own research and never invest more than you can afford to lose.

## License

MIT
