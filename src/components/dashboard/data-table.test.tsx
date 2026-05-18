import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataTable, type DataTableColumn } from "./data-table";

type DuplicateNameRow = {
  id?: string;
  adName: string;
  dateStart: string;
};

const columns: DataTableColumn<DuplicateNameRow>[] = [
  { header: "Ad name", accessor: "adName" },
  { header: "Date", accessor: "dateStart" },
];

describe("DataTable", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses row ids instead of duplicate visible names for React keys", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <DataTable
        columns={columns}
        data={[
          { id: "metric_1", adName: "Travis Drum Angle", dateStart: "2026-05-10" },
          { id: "metric_2", adName: "Travis Drum Angle", dateStart: "2026-05-11" },
        ]}
      />,
    );

    const duplicateKeyWarning = errorSpy.mock.calls.some((call) =>
      call.join(" ").includes("Encountered two children with the same key"),
    );

    expect(duplicateKeyWarning).toBe(false);
  });

  it("allows callers to provide stable ids for rows without an id field", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <DataTable
        columns={columns}
        data={[
          { adName: "Speed Angle", dateStart: "2026-05-10" },
          { adName: "Speed Angle", dateStart: "2026-05-11" },
        ]}
        getRowId={(row, index) => `${row.dateStart}-${index}`}
      />,
    );

    const duplicateKeyWarning = errorSpy.mock.calls.some((call) =>
      call.join(" ").includes("Encountered two children with the same key"),
    );

    expect(duplicateKeyWarning).toBe(false);
  });
});
