import type { NextRequest } from "next/server";

import { handleAuthCallback } from "./handler";

export async function GET(request: NextRequest) {
  return handleAuthCallback(request);
}
