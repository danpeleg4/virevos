import { http, HttpResponse, type RequestHandler } from "msw";
import type { UserProfile } from "@/types/user_profile";

export const profileFixture: UserProfile = {
  name: "John Doe",
  email: "john@example.com",
  jobTitle: "",
  company: "",
  bio: "",
};

export const avatarFixture = { url: null as string | null };

export const userHandlers: RequestHandler[] = [
  http.get("/api/user", ({ request }) => {
    const type = new URL(request.url).searchParams.get("type");
    if (type === "profile") return HttpResponse.json(profileFixture);
    if (type === "avatar") return HttpResponse.json(avatarFixture);
    if (type === "product-updates") return HttpResponse.json(false);
    return HttpResponse.json({ error: "No type found" }, { status: 400 });
  }),

  http.patch("/api/user", async ({ request }) => {
    const body = (await request.json()) as {
      type: string;
      data?: Record<string, unknown>;
    };
    if (body.type === "profile") {
      return HttpResponse.json({ ...profileFixture, ...body.data });
    }
    if (body.type === "password") {
      return HttpResponse.json({ success: true });
    }
    if (body.type === "product-updates") {
      return HttpResponse.json({ enabled: body.data?.enabled === true });
    }
    if (body.type === "recording-status") {
      return HttpResponse.json({ success: true });
    }
    return HttpResponse.json({ error: "No type found" }, { status: 400 });
  }),

  http.post("/api/user/avatar", () =>
    HttpResponse.json({ url: "https://cdn/avatar.png" })
  ),

  http.get("/api/integrations/outlook", () =>
    HttpResponse.json({ connected: false })
  ),

  http.get("/api/recording/status", () =>
    HttpResponse.json({ recording_status: false })
  ),
];
