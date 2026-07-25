import { NextRequest, NextResponse } from "next/server";
import { uploadPortalFile } from "@/lib/portal/portal_file_uploads";
import { portalUploadsDrizzle } from "@db/portal_uploads_db";
import { supabaseStorageClient } from "@/api_client/supabase_storage_client";
import { planLimitsDrizzle } from "@db/plan_limits_db";
import { billingDrizzle } from "@db/billing_db";
import { ValidationError } from "@/lib/util/validation";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await ctx.params;
    const formData = await req.formData();
    const result = await uploadPortalFile(
      token,
      formData,
      portalUploadsDrizzle,
      supabaseStorageClient,
      planLimitsDrizzle,
      billingDrizzle
    );
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/portal/[token]/files POST]", err);
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
