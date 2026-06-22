import { NextResponse } from "next/server";

import { buildAdmissionsApiResponse } from "@/lib/api";
import { normalizeYear } from "@/lib/filters";

export function GET(request: Request) {
  const url = new URL(request.url);
  const year = normalizeYear(url.searchParams.get("year") ?? "all");

  if (!year) {
    return NextResponse.json(
      {
        error: "Invalid year. Use all, 2024, 2025, or 2026.",
      },
      { status: 400 },
    );
  }

  url.searchParams.delete("year");
  const response = buildAdmissionsApiResponse(year, url.searchParams);
  return NextResponse.json(response);
}
