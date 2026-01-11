export interface DCAConfig {
  amountAUD: number;
  frequency: "daily" | "weekly" | "monthly";
}

export interface DCAResult {
  amountAUD: number;
  reason: string;
}

export function calculateDCAAmount(config: DCAConfig): DCAResult {
  return {
    amountAUD: config.amountAUD,
    reason: `Standard DCA: Buying $${config.amountAUD.toFixed(2)} AUD (${config.frequency})`,
  };
}

export function getNextDCADate(
  lastRun: Date | null,
  frequency: "daily" | "weekly" | "monthly"
): Date {
  const now = new Date();

  if (!lastRun) {
    return now;
  }

  const next = new Date(lastRun);

  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
  }

  return next > now ? next : now;
}

export function frequencyToCron(frequency: "daily" | "weekly" | "monthly"): string {
  switch (frequency) {
    case "daily":
      return "0 9 * * *";
    case "weekly":
      return "0 9 * * 1";
    case "monthly":
      return "0 9 1 * *";
  }
}
