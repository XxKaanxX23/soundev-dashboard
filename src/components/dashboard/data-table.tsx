import { ReactNode } from "react";

export type DataTableColumn<T> = {
  header: string;
  accessor: keyof T | ((row: T) => ReactNode);
  align?: "left" | "right";
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T, index: number) => string;
};

export function DataTable<T>({ columns, data, getRowKey }: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/10 bg-zinc-950">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-white/[0.03]">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.header}
                  className={
                    column.align === "right"
                      ? "px-4 py-3 text-right font-medium text-zinc-400"
                      : "px-4 py-3 text-left font-medium text-zinc-400"
                  }
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {data.map((row, index) => (
              <tr key={getRowKey(row, index)} className="hover:bg-white/[0.03]">
                {columns.map((column) => {
                  const value =
                    typeof column.accessor === "function"
                      ? column.accessor(row)
                      : (row[column.accessor] as ReactNode);

                  return (
                    <td
                      key={column.header}
                      className={
                        column.align === "right"
                          ? "whitespace-nowrap px-4 py-3 text-right text-zinc-200"
                          : "whitespace-nowrap px-4 py-3 text-left text-zinc-200"
                      }
                    >
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
