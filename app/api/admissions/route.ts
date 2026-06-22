import { NextResponse } from "next/server";

import { buildAdmissionsApiResponse, normalizeSearchParams } from "@/lib/api";
import { normalizeYear } from "@/lib/filters";

const API_CACHE_CONTROL = "public, max-age=31536000, stale-while-revalidate=31536000";

export async function GET(request: Request) {
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
  const response = await buildAdmissionsApiResponse(year, normalizeSearchParams(url.searchParams));
  return NextResponse.json(response, {
    headers: {
      "Cache-Control": API_CACHE_CONTROL,
    },
  });
}
