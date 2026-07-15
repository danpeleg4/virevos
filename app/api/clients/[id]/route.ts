import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  deleteClient,
  getClientCases,
  getClientMain,
  getClientOutlookEmails,
  getClientPortal,
  updateExistingClient,
} from "@/lib/workspace/clients";
import { clientsDrizzle } from "@db/clients_db";
import { ValidationError } from "@/lib/util/validation";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const searchParams = _req.nextUrl.searchParams;
  const type = searchParams.get("type");

  const user = await getCurrentUser();
  if (!user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const clientId = Number(id);
  if (Number.isNaN(clientId))
    return NextResponse.json({ error: "Invalid clientId" }, { status: 400 });

  try {
    if (type === "main") {
      const result = await getClientMain(clientId, clientsDrizzle);
      if (!result) {
        return NextResponse.json(
          { error: "Client not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(result);
    }
    if (type === "cases") {
      const casesWithStats = await getClientCases(clientId, clientsDrizzle);
      return NextResponse.json({ cases: casesWithStats });
    }
    if (type === "outlook-emails") {
      const emails = await getClientOutlookEmails(clientId, clientsDrizzle);
      return NextResponse.json({ emails });
    }
    if (type == "portal") {
      const portal = await getClientPortal(clientId, clientsDrizzle);
      return NextResponse.json({ portal });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    console.error(error);
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    await updateExistingClient({ ...body, id: clientId }, clientsDrizzle);
    return NextResponse.json({ success: true, id: clientId });
  } catch (err) {
    console.error("[api/clients/[id] PATCH]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
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

    await deleteClient({ id: clientId }, clientsDrizzle);
    return NextResponse.json({ success: true, id: clientId });
  } catch (err) {
    console.error("[api/clients/[id] DELETE]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Failed to delete client" },
      { status: 500 }
    );
  }
}
