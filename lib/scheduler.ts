import { CronExpressionParser } from "cron-parser";

export function parseCronExpression(expression: string): Date {
  const interval = CronExpressionParser.parse(expression);
  return interval.next().toDate();
}

export function getNextRunTime(cronExpression: string): number {
  return parseCronExpression(cronExpression).getTime();
}

export function isJobDue(nextRun: number): boolean {
  return Date.now() >= nextRun;
}

export function frequencyToCronExpression(
  frequency: "daily" | "weekly" | "monthly",
  hour: number = 9,
  minute: number = 0
): string {
  switch (frequency) {
    case "daily":
      return `${minute} ${hour} * * *`;
    case "weekly":
      return `${minute} ${hour} * * 1`;
    case "monthly":
      return `${minute} ${hour} 1 * *`;
  }
}

export function cronToHumanReadable(expression: string): string {
  const parts = expression.split(" ");
  if (parts.length !== 5) return expression;

  const [minute, hour, dayOfMonth, , dayOfWeek] = parts;

  if (dayOfMonth === "*" && dayOfWeek === "*") {
    return `Daily at ${hour}:${minute.padStart(2, "0")}`;
  }

  if (dayOfMonth === "*" && dayOfWeek !== "*") {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = days[parseInt(dayOfWeek)] || dayOfWeek;
    return `Weekly on ${dayName} at ${hour}:${minute.padStart(2, "0")}`;
  }

  if (dayOfMonth !== "*") {
    return `Monthly on day ${dayOfMonth} at ${hour}:${minute.padStart(2, "0")}`;
  }

  return expression;
}
