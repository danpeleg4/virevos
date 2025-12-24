import {NextRequest, NextResponse} from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { projectFiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { supabase } from "@/lib/supabase";

export async function GET(
    _req: NextRequest,
    ctx: { params: Promise<{ id: string }> }
) {
    const user = await currentUser();
    if (!user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await ctx.params;
    const fileId = Number(id);

    const [file] = await db
        .select()
        .from(projectFiles)
        .where(eq(projectFiles.id, fileId));

    if (!file) {
        return new NextResponse("Not found", { status: 404 });
    }

    const { data, error } = await supabase.storage
        .from("ProjectFiles")
        .download(file.path);

    if (error || !data) {
        return new NextResponse("Download failed", { status: 500 });
    }

    const buffer = await data.arrayBuffer();
    return new NextResponse(buffer, {
        headers: {
            "Content-Type": file.mimeType ?? "application/octet-stream",
            "Content-Disposition": `attachment; filename="${file.name}"`,
            "Content-Length": buffer.byteLength.toString(),
        },
    });
}
