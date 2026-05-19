import { describe, expect, it } from "vitest";
import { formatReportingWindow, getLast24HoursWindow } from "./date-ranges";

describe("date range helpers", () => {
  it("builds a rolling last-24-hours window from the provided instant", () => {
    const now = new Date("2026-05-19T15:30:00.000Z");
    const window = getLast24HoursWindow("America/Chicago", now);

    expect(window).toEqual({
      timezone: "America/Chicago",
      start: new Date("2026-05-18T15:30:00.000Z"),
      end: now,
    });
  });

  it("formats the reporting window in America/Chicago time", () => {
    const window = getLast24HoursWindow(
      "America/Chicago",
      new Date("2026-05-19T15:30:00.000Z"),
    );

    expect(formatReportingWindow(window, "America/Chicago")).toBe(
      "May 18, 10:30 AM - May 19, 10:30 AM CDT",
    );
  });
});
