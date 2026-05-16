import { POST } from "@/app/api/token/route";
import { NextRequest } from "next/server";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

const { where } = vi.hoisted(() => ({ where: vi.fn() }));

vi.mock("@db/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where,
      }),
    }),
  },
  where,
}));

vi.mock("livekit-server-sdk", () => {
  return {
    AccessToken: vi.fn(function () {
      return {
        addGrant: vi.fn(),
        toJwt: vi.fn().mockResolvedValue("jwt-token"),
      };
    }),
    RoomServiceClient: vi.fn(function () {
      return {
        listRooms: vi.fn().mockResolvedValue([]),
        createRoom: vi.fn().mockResolvedValue({ name: "room1" }),
      };
    }),
  };
});

function req(body: unknown): NextRequest {
  return {
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
}

describe("POST /token", () => {
  it("400 missing meetingId", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });

  it("404 invalid meeting", async () => {
    where.mockResolvedValueOnce([]);

    await expect(POST(req({ meetingId: "1", name: "Dan" }))).rejects.toThrow(
      "NOT_FOUND"
    );
  });

  it("403 meeting not started", async () => {
    where.mockResolvedValueOnce([
      {
        id: "1",
        isMeeting: true,
        origin: "app",
        dateTime: new Date(Date.now() + 60000),
        duration: 30,
      },
    ]);

    const res = await POST(req({ meetingId: "1", name: "Dan" }));
    expect(res.status).toBe(403);
  });

  it("410 meeting ended", async () => {
    where.mockResolvedValueOnce([
      {
        id: "1",
        isMeeting: true,
        origin: "app",
        dateTime: new Date(Date.now() - 60 * 60 * 1000),
        duration: 10,
      },
    ]);

    const res = await POST(req({ meetingId: "1", name: "Dan" }));
    expect(res.status).toBe(410);
  });

  it("200 returns token and meeting data", async () => {
    where
      .mockResolvedValueOnce([
        {
          id: "1",
          userId: "user_1",
          title: "Daily Sync",
          isMeeting: true,
          origin: "app",
          dateTime: new Date(Date.now() - 1000),
          duration: 30,
        },
      ])
      .mockResolvedValueOnce([{ title: "Daily Sync" }]);

    const res = await POST(req({ meetingId: "1", name: "Dan" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      token: "jwt-token",
      meetingTitle: "Daily Sync",
      url: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    });
  });
});
