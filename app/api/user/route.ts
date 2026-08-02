import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  changePassword,
  changeRecordingStatus,
  getAvatarUrl,
  getProductUpdatesPreference,
  getUserProfile,
  updateProductUpdatesPreference,
  updateProfile,
} from "@/lib/user";
import { userDrizzle } from "@db/classes/user_db";
import { supabaseStorageClient } from "@/api_client/supabase_storage_client";
import { ValidationError } from "@/lib/util/validation";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");

  try {
    if (type == "avatar")
      return NextResponse.json(
        await getAvatarUrl(userDrizzle, supabaseStorageClient)
      );
    if (type == "product-updates")
      return NextResponse.json(await getProductUpdatesPreference(userDrizzle));
    if (type == "profile")
      return NextResponse.json(await getUserProfile(userDrizzle));

    return NextResponse.json({ error: "No type found" }, { status: 400 });
  } catch (err) {
    console.error("[api/user GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (body.type == "profile") {
      const profile = await updateProfile(body.data, userDrizzle);
      return NextResponse.json(profile);
    }
    if (body.type == "password") {
      return NextResponse.json(await changePassword(body.data));
    }
    if (body.type == "product-updates") {
      return NextResponse.json(
        await updateProductUpdatesPreference(body.data?.enabled, userDrizzle)
      );
    }
    if (body.type == "recording-status") {
      await changeRecordingStatus(userDrizzle);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "No type found" }, { status: 400 });
  } catch (err) {
    console.error("[api/user PATCH]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
