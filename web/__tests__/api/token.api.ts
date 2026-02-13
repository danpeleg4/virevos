import { POST } from "@/app/api/token/route";
import { NextRequest } from "next/server";

jest.mock("next/navigation", () => ({
    notFound: jest.fn(() => {
        throw new Error("NOT_FOUND");
    }),
}));

jest.mock("@db/db", () => {
    const where = jest.fn();
    return {
        db: {
            select: jest.fn().mockReturnValue({
                from: jest.fn().mockReturnValue({
                    where,
                }),
            }),
        },
        where,
    };
});

jest.mock("livekit-server-sdk", () => {
    return {
        AccessToken: jest.fn().mockImplementation(() => ({
            addGrant: jest.fn(),
            toJwt: jest.fn().mockResolvedValue("jwt-token"),
        })),
        RoomServiceClient: jest.fn().mockImplementation(() => ({
            listRooms: jest.fn().mockResolvedValue([]),
            createRoom: jest.fn().mockResolvedValue({ name: "room1" }),
        })),
        EgressClient: jest.fn().mockImplementation(() => ({
            startRoomCompositeEgress: jest.fn().mockResolvedValue(undefined),
        })),
        EncodedFileOutput: jest.fn(),
        EncodingOptionsPreset: {
            H264_1080P_30: "preset",
        },
    };
});

const { where } = jest.requireMock("@db/db") as {
    where: jest.Mock;
};

function req(body: unknown): NextRequest {
    return {
        json: jest.fn().mockResolvedValue(body),
    } as unknown as NextRequest;
}

describe("POST /token", () => {
    it("400 missing meetingId", async () => {
        const res = await POST(req({}));
        expect(res.status).toBe(400);
    });

    it("404 invalid meeting", async () => {
        where.mockResolvedValueOnce([]);

        await expect(
            POST(req({ meetingId: "1", name: "Dan" }))
        ).rejects.toThrow("NOT_FOUND");
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
