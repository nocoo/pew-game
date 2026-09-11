import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "no-store",
} as const;

export async function GET() {
  let connected = false;

  try {
    const db = getDb();
    // Read at most one row from the scores table to verify both SQLite and schema health.
    // An empty table is healthy and returns undefined/null.
    db.prepare("SELECT 1 FROM scores LIMIT 1").get();
    connected = true;
  } catch {
    // Fail-closed without leaking database path, table schemas, or query details.
    connected = false;
  }

  const status = connected ? "ok" : "error";
  const body = {
    status,
    version: APP_VERSION,
    database: {
      connected,
    },
  };

  return NextResponse.json(body, {
    status: connected ? 200 : 503,
    headers,
  });
}
