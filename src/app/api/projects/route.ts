import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, businessUnits, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { generateId } from "@/lib/server-utils";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  const roles = session.user.roles || [role];
  const buId = session.user.businessUnitId;

  const baseQuery = db
    .select({
      id: projects.id,
      clientCompany: projects.clientCompany,
      projectName: projects.projectName,
      businessUnitId: projects.businessUnitId,
      businessUnitName: businessUnits.name,
      projectManagerId: projects.projectManagerId,
      projectManagerName: users.name,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .leftJoin(businessUnits, eq(projects.businessUnitId, businessUnits.id))
    .leftJoin(users, eq(projects.projectManagerId, users.id));

  // CS and BU_HEAD only see projects in their BU
  const allProjects = (role === "CS" || role === "BU_HEAD") && buId
    ? await baseQuery.where(eq(projects.businessUnitId, buId)).all()
    : await baseQuery.all();

  return NextResponse.json(allProjects);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles = session.user.roles || [session.user.role];
  if (!roles.some(r => ["BU_HEAD", "ADMIN"].includes(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { clientCompany, projectName, projectManagerId } = body;

  // BU_HEAD always uses their own BU; ADMIN can pass businessUnitId explicitly
  const isBuHead = roles.includes("BU_HEAD") && !roles.includes("ADMIN");
  const businessUnitId = isBuHead ? session.user.businessUnitId : body.businessUnitId;

  if (!businessUnitId) return NextResponse.json({ error: "Business unit wajib diisi" }, { status: 400 });

  const project = await db
    .insert(projects)
    .values({
      id: generateId(),
      clientCompany,
      projectName,
      businessUnitId,
      projectManagerId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()
    .get();

  return NextResponse.json(project);
}
