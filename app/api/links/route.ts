import { NextResponse } from "next/server";
import { listPublicLinks } from "@/lib/store";

export async function GET() {
  const data = await listPublicLinks();
  return NextResponse.json({ data });
}
