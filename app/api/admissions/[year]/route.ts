import { NextResponse } from "next/server";

import { buildAdmissionsApiResponse, normalizeSearchParams } from "@/lib/api";
import { normalizeYear } from "@/lib/filters";

type RouteContext = {
  params: Promise<{ year: string }>;
};

const API_CACHE_CONTROL = "public, max-age=31536000, stale-while-revalidate=31536000";

export async function GET(request: Request, context: RouteContext) {
  const { year: yearParam } = await context.params;
  const year = normalizeYear(yearParam);

  if (!year) {
    return NextResponse.json(
      {
        error: "Invalid year. Use all, 2024, 2025, or 2026.",
      },
      { status: 400 },
    );
  }

  const response = await buildAdmissionsApiResponse(
    year,
    normalizeSearchParams(new URL(request.url).searchParams),
  );
  return NextResponse.json(response, {
    headers: {
      "Cache-Control": API_CACHE_CONTROL,
    },
  });
}
