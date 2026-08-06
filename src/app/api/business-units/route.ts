import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { businessUnits } from "@/db/schema";
import { auth } from "@/lib/auth";
import { generateId } from "@/lib/server-utils";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles = session.user.roles || [session.user.role];

  const all = await db.select().from(businessUnits).all();
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles = session.user.roles || [session.user.role];
  if (!roles.includes("ADMIN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, code } = body;

  const bu = await db
    .insert(businessUnits)
    .values({ id: generateId(), name, code, createdAt: new Date() })
    .returning()
    .get();

  return NextResponse.json(bu);
}
