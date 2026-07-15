import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/auth";
import { uploadAvatar } from "@/lib/user";
import { userDrizzle } from "@db/user_db";
import { supabaseStorageClient } from "@/api_client/supabase_storage_client";
import { ValidationError } from "@/lib/util/validation";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const result = await uploadAvatar(
      formData,
      userDrizzle,
      supabaseStorageClient
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/user/avatar POST]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
