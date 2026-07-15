import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { savePortalSettings } from "@/lib/portal_settings";
import { portalDrizzle } from "@db/portal_db";
import { ValidationError } from "@/lib/util/validation";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const clientId = Number(id);
    if (Number.isNaN(clientId)) {
      return NextResponse.json({ error: "Invalid clientId" }, { status: 400 });
    }

    const body = await req.json();
    const result = await savePortalSettings(
      { ...body, clientId },
      portalDrizzle
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/clients/[id]/portal POST]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to save portal settings" },
      { status: 500 }
    );
  }
}
