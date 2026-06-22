import { NextResponse } from "next/server";

import { buildAdmissionsApiResponse } from "@/lib/api";
import { normalizeYear } from "@/lib/filters";

type RouteContext = {
  params: Promise<{ year: string }>;
};

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

  const response = buildAdmissionsApiResponse(year, new URL(request.url).searchParams);
  return NextResponse.json(response);
}
