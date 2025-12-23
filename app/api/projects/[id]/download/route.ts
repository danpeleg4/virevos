import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { projectFiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { supabase } from "@/lib/supabase";

export async function GET(
    _req: Request,
    { params }: { params: { id: string } }
) {
    const user = await currentUser();
    if (!user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const fileId = Number(params.id);

    const [file] = await db
        .select()
        .from(projectFiles)
        .where(eq(projectFiles.id, fileId));

    if (!file) {
        return new NextResponse("Not found", { status: 404 });
    }

    const { data, error } = await supabase.storage
        .from("ProjectFiles")
        .createSignedUrl(file.path, 60); // 60 seconds

    if (error || !data?.signedUrl) {
        return new NextResponse("Failed to generate download URL", { status: 500 });
    }

    return NextResponse.json(data.signedUrl);
}
