import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userBusinessUnits, businessUnits } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { generateId } from "@/lib/server-utils";

// GET /api/users/[id]/business-units
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles = session.user.roles || [session.user.role];
  if (!roles.includes("ADMIN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const assignments = await db
    .select({ id: userBusinessUnits.id, businessUnitId: userBusinessUnits.businessUnitId, name: businessUnits.name })
    .from(userBusinessUnits)
    .leftJoin(businessUnits, eq(userBusinessUnits.businessUnitId, businessUnits.id))
    .where(eq(userBusinessUnits.userId, id))
    .all();

  return NextResponse.json(assignments);
}

// POST /api/users/[id]/business-units
// Body: { businessUnitIds: string[] } — replaces all assignments
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles = session.user.roles || [session.user.role];
  if (!roles.includes("ADMIN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { businessUnitIds } = await req.json();

  // Replace all assignments
  await db.delete(userBusinessUnits).where(eq(userBusinessUnits.userId, id));

  if (Array.isArray(businessUnitIds) && businessUnitIds.length > 0) {
    for (const buId of businessUnitIds) {
      await db.insert(userBusinessUnits).values({
        id: generateId(),
        userId: id,
        businessUnitId: buId,
        createdAt: new Date(),
      });
    }
  }

  return NextResponse.json({ success: true });
}
