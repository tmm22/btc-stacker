import Link from "next/link";
import { Bitcoin, TrendingUp, Shield, Zap, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <header className="border-b border-gray-800">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Bitcoin className="h-8 w-8 text-orange-500" />
            <span className="text-xl font-bold text-white">BTC Stacker</span>
          </div>
          <Link
            href="/dashboard"
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
          >
            Launch App
          </Link>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-5xl font-bold text-white mb-6">
            Automate Your Bitcoin
            <span className="text-orange-500"> Accumulation</span>
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Use proven, backtested strategies to maximize your Bitcoin holdings.
            Connect to Bitaroo and let smart algorithms handle the timing.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-3 text-lg font-medium text-white hover:bg-orange-600 transition-colors"
            >
              Get Started
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/dashboard/strategies"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-6 py-3 text-lg font-medium text-white hover:bg-gray-800 transition-colors"
            >
              View Strategies
            </Link>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <div className="mb-4 inline-flex rounded-lg bg-orange-500/10 p-3">
                <TrendingUp className="h-6 w-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Proven Strategies
              </h3>
              <p className="text-gray-400">
                DCA, Value Averaging, Moving Average, and RSI-based strategies -
                all backtested against historical data.
              </p>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <div className="mb-4 inline-flex rounded-lg bg-orange-500/10 p-3">
                <Zap className="h-6 w-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Automated Execution
              </h3>
              <p className="text-gray-400">
                Set it and forget it. Schedule automatic purchases or execute
                manually when conditions are right.
              </p>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <div className="mb-4 inline-flex rounded-lg bg-orange-500/10 p-3">
                <Shield className="h-6 w-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Secure by Design
              </h3>
              <p className="text-gray-400">
                Your API keys are encrypted locally. Buy-only mode means your
                Bitcoin is always safe.
              </p>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 md:p-12">
            <div className="grid gap-8 md:grid-cols-2 items-center">
              <div>
                <h2 className="text-3xl font-bold text-white mb-4">
                  Why Automated Accumulation?
                </h2>
                <ul className="space-y-4 text-gray-400">
                  <li className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-orange-500" />
                    <span>
                      Remove emotion from buying decisions - algorithms don&apos;t panic
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-orange-500" />
                    <span>
                      Buy more when prices are low with smart strategies
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-orange-500" />
                    <span>
                      Consistent execution - never miss a scheduled purchase
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-orange-500" />
                    <span>
                      Track performance and optimize your strategy over time
                    </span>
                  </li>
                </ul>
              </div>
              <div className="rounded-xl border border-gray-700 bg-gray-800 p-6">
                <div className="text-sm text-gray-400 mb-2">Strategy Example</div>
                <div className="text-2xl font-bold text-white mb-4">
                  200-Day Moving Average
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">When price is above MA</span>
                    <span className="text-white">Buy $100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">When price is below MA</span>
                    <span className="text-green-500">Buy $200 (2x)</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <span className="text-gray-400">
                      Historically outperforms simple DCA by buying more during dips
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Stack Sats?
          </h2>
          <p className="text-gray-400 mb-8">
            Connect your Bitaroo account and start accumulating Bitcoin today.
          </p>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-8 py-4 text-lg font-medium text-white hover:bg-orange-600 transition-colors"
          >
            Connect Bitaroo
            <ArrowRight className="h-5 w-5" />
          </Link>
        </section>
      </main>

      <footer className="border-t border-gray-800 py-8">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          <p>BTC Stacker - Automated Bitcoin Accumulation</p>
          <p className="mt-2">
            Not financial advice. Trade responsibly. Powered by Bitaroo.
          </p>
        </div>
      </footer>
    </div>
  );
}
