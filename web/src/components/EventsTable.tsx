import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchEvents } from "../api/client";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import type { ActionEvent } from "../types";

const PAGE_SIZE = 30;
const ROW_HEIGHT = 38;

const columns: ColumnDef<ActionEvent>[] = [
  {
    accessorKey: "serverTimestamp",
    header: "Time (server)",
    cell: (info) => (
      <span className="mono">{new Date(info.getValue<string>()).toLocaleString()}</span>
    ),
  },
  {
    accessorKey: "buttonValue",
    header: "Button",
    cell: (info) => <span className="button-chip">{info.getValue<number>()}</span>,
  },
  {
    accessorKey: "deviceId",
    header: "Device",
    cell: (info) => <span className="mono">{info.getValue<string>()}</span>,
  },
  {
    accessorKey: "sessionId",
    header: "Session",
    cell: (info) => <span className="mono">{(info.getValue<string>() || "").slice(0, 12)}</span>,
  },
  {
    accessorKey: "platform",
    header: "Platform",
  },
  {
    accessorKey: "appVersion",
    header: "Version",
  },
];

const GRID_TEMPLATE =
  "minmax(180px, 2fr) 90px minmax(160px, 1.5fr) minmax(140px, 1.5fr) 100px minmax(90px, 1fr)";

export function EventsTable() {
  const [search, setSearch] = useState("");
  const [buttonFilter, setButtonFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState("serverTimestamp");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["events", debouncedSearch, buttonFilter, sortBy, sortDir, page],
    queryFn: () =>
      fetchEvents({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        buttonValue: buttonFilter === "all" ? undefined : Number(buttonFilter),
        sortBy,
        sortDir,
      }),
    placeholderData: (prev) => prev,
  });

  const rows = data?.data ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0;

  function toggleSort(columnId: string) {
    if (sortBy === columnId) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(columnId);
      setSortDir("desc");
    }
    setPage(1);
  }

  const headerGroups = table.getHeaderGroups();

  const statusLabel = useMemo(() => {
    if (isLoading) return "Loading…";
    if (isError) return "Failed to load events";
    return `${data?.total ?? 0} matching events`;
  }, [isLoading, isError, data]);

  return (
    <div className="card panel">
      <div className="panel-header">
        <h2 className="panel-title">Event log</h2>
        <span className="mono" style={{ fontSize: 12 }}>{statusLabel}</span>
      </div>

      <div className="controls-row" style={{ marginBottom: 12 }}>
        <input
          className="input"
          placeholder="Search device, platform, session…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          aria-label="Search events"
        />
        <select
          className="select"
          value={buttonFilter}
          onChange={(e) => {
            setButtonFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by button value"
        >
          <option value="all">All buttons</option>
          {Array.from({ length: 10 }, (_, i) => (
            <option key={i} value={i}>
              Button {i}
            </option>
          ))}
        </select>
      </div>

      <div className="table-scroll" ref={parentRef} style={{ ["--cols" as string]: GRID_TEMPLATE }}>
        <div className="table-head-row" style={{ ["--cols" as string]: GRID_TEMPLATE }}>
          {headerGroups[0].headers.map((header) => (
            <div
              key={header.id}
              className="table-head-cell"
              onClick={() => toggleSort(header.column.id)}
            >
              {flexRender(header.column.columnDef.header, header.getContext())}
              {sortBy === header.column.id ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
            </div>
          ))}
        </div>

        {rows.length === 0 && !isLoading ? (
          <div className="empty-state">No events match these filters yet.</div>
        ) : (
          <div style={{ position: "relative" }}>
            <div style={{ height: paddingTop }} />
            {virtualRows.map((virtualRow) => {
              const row = table.getRowModel().rows[virtualRow.index];
              return (
                <div
                  key={row.id}
                  className="table-body-row"
                  style={{ ["--cols" as string]: GRID_TEMPLATE, height: ROW_HEIGHT }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <div key={cell.id} className="table-cell">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  ))}
                </div>
              );
            })}
            <div style={{ height: paddingBottom }} />
          </div>
        )}
      </div>

      <div className="pagination" aria-label="Event log pagination">
        <span className="mono pagination-status">
          Page {page} of {totalPages}
        </span>
        <div className="pagination-actions">
          <button
            className="btn-ghost pagination-btn"
            type="button"
            onClick={() => setPage((current) => current - 1)}
            disabled={page === 1 || isLoading}
          >
            Previous
          </button>
          <button
            className="btn-ghost pagination-btn"
            type="button"
            onClick={() => setPage((current) => current + 1)}
            disabled={page >= totalPages || isLoading}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
