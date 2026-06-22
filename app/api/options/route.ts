import { NextResponse } from "next/server";

import { buildOptionsApiResponse } from "@/lib/api";

export function GET() {
  return NextResponse.json(buildOptionsApiResponse());
}
