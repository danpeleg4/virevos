import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { AxiosApiClient } from "@/api_client/axios_api_client";

// The one HTTP boundary test that talks to a real (intercepted) network —
// MSW node interception instead of mocking axios.
const BASE = "http://api.test";

const server = setupServer(
  http.get(`${BASE}/items`, ({ request }) =>
    HttpResponse.json({
      items: [1, 2],
      echoAuth: request.headers.get("authorization"),
    })
  ),
  http.post(`${BASE}/items`, async ({ request }) =>
    HttpResponse.json({ created: await request.json() }, { status: 201 })
  ),
  http.patch(`${BASE}/items/1`, async ({ request }) =>
    HttpResponse.json({ patched: await request.json() })
  ),
  http.put(`${BASE}/items/1`, async ({ request }) =>
    HttpResponse.json({ replaced: await request.json() })
  ),
  http.delete(`${BASE}/items/1`, () => HttpResponse.json({ deleted: true }))
);

const client = new AxiosApiClient();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("AxiosApiClient", () => {
  it("get returns the response body and forwards config headers", async () => {
    const res = await client.get<{ items: number[]; echoAuth: string }>(
      `${BASE}/items`,
      { headers: { Authorization: "Bearer t-1" } }
    );

    expect(res).toEqual({ items: [1, 2], echoAuth: "Bearer t-1" });
  });

  it("post sends the payload and returns the response body", async () => {
    const res = await client.post<{ created: { name: string } }>(
      `${BASE}/items`,
      { name: "a" }
    );

    expect(res).toEqual({ created: { name: "a" } });
  });

  it("patch sends the payload and returns the response body", async () => {
    const res = await client.patch<{ patched: { name: string } }>(
      `${BASE}/items/1`,
      { name: "b" }
    );

    expect(res).toEqual({ patched: { name: "b" } });
  });

  it("put sends the payload and returns the response body", async () => {
    const res = await client.put<{ replaced: { name: string } }>(
      `${BASE}/items/1`,
      { name: "c" }
    );

    expect(res).toEqual({ replaced: { name: "c" } });
  });

  it("delete returns the response body", async () => {
    const res = await client.delete<{ deleted: boolean }>(`${BASE}/items/1`);

    expect(res).toEqual({ deleted: true });
  });

  it("rejects with the axios error when the server responds with an error status", async () => {
    server.use(
      http.get(`${BASE}/items`, () =>
        HttpResponse.json({ error: "boom" }, { status: 500 })
      )
    );

    await expect(client.get(`${BASE}/items`)).rejects.toMatchObject({
      response: { status: 500 },
    });
  });
});
