import { NextResponse } from "next/server";

import { buildOptionsApiResponse } from "@/lib/api";

const API_CACHE_CONTROL = "public, max-age=31536000, stale-while-revalidate=31536000";

export async function GET() {
  return NextResponse.json(await buildOptionsApiResponse(), {
    headers: {
      "Cache-Control": API_CACHE_CONTROL,
    },
  });
}
