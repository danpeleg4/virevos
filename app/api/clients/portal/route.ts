import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { getPortalEnabledClients } from "@/lib/workspace/clients";
import { clientsDrizzle } from "@db/classes/clients_db";
import { ValidationError } from "@/lib/util/validation";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const rows = await getPortalEnabledClients(clientsDrizzle);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("[api/clients/portal GET]", error);
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
