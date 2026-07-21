import { NextResponse } from "next/server";

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

/** Standard success envelope. */
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

/** Standard success envelope with pagination metadata. */
export function okPaginated<T>(
  data: T,
  pagination: Pagination,
  init?: ResponseInit
) {
  return NextResponse.json({ ok: true, data, pagination }, init);
}

/** Standard error envelope. */
export function fail(error: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

/** Parse and clamp pagination query params. */
export function parsePagination(
  url: URL,
  { defaultLimit = 20, maxLimit = 100 } = {}
): { page: number; limit: number; skip: number } {
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const rawLimit = parseInt(
    url.searchParams.get("limit") || String(defaultLimit),
    10
  );
  const limit = Math.min(maxLimit, Math.max(1, rawLimit || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export function buildPagination(
  page: number,
  limit: number,
  total: number
): Pagination {
  return { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) };
}

/** Escape a user-supplied string for safe use inside a RegExp. */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
