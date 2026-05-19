export type ReportingWindow = {
  timezone: string;
  start: Date;
  end: Date;
};

export function getLast24HoursWindow(
  timezone: string,
  now: Date = new Date(),
): ReportingWindow {
  return {
    timezone,
    start: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    end: now,
  };
}

export function formatReportingWindow(
  window: ReportingWindow,
  timezone = window.timezone,
) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  const start = formatter.formatToParts(window.start);
  const end = formatter.formatToParts(window.end);
  const timeZoneName =
    end.find((part) => part.type === "timeZoneName")?.value ?? "";
  const withoutZone = (parts: Intl.DateTimeFormatPart[]) =>
    parts
      .filter((part) => part.type !== "timeZoneName")
      .map((part) => part.value)
      .join("")
      .trim()
      .replace(/\u202f/g, " ")
      .replace(/,\s*$/, "");

  return `${withoutZone(start)} - ${withoutZone(end)} ${timeZoneName}`.trim();
}

export function formatDateInTimeZone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function isTimestampInWindow(
  value: string | null | undefined,
  window: ReportingWindow,
) {
  if (!value) {
    return false;
  }

  const timestamp = new Date(value).getTime();

  return (
    !Number.isNaN(timestamp) &&
    timestamp >= window.start.getTime() &&
    timestamp <= window.end.getTime()
  );
}
