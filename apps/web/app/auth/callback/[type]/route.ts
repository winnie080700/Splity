import type { NextRequest } from "next/server";

import { handleAuthCallback } from "../handler";

type CallbackRouteProps = {
  params: Promise<{ type: string }>;
};

export async function GET(request: NextRequest, { params }: CallbackRouteProps) {
  const { type } = await params;

  return handleAuthCallback(request, type);
}
