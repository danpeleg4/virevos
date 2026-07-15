import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { http, HttpResponse } from "msw";
import { worker } from "../msw/worker";
import { renderWithQueryClient } from "../_helpers/render";

function Smoke() {
  const query = useQuery({
    queryKey: ["msw-smoke"],
    queryFn: async () => {
      const res = await axios.get<{ message: string }>("/api/msw-smoke");
      return res.data;
    },
  });

  if (query.isPending) return <div>loading</div>;
  if (query.isError) return <div>request failed</div>;
  return <div>{query.data.message}</div>;
}

describe("MSW browser integration", () => {
  it("serves an axios queryFn through a handler", async () => {
    worker.use(
      http.get("/api/msw-smoke", () =>
        HttpResponse.json({ message: "hello from msw" })
      )
    );

    const screen = await renderWithQueryClient(<Smoke />);

    await expect
      .element(screen.getByText("hello from msw", { exact: true }))
      .toBeInTheDocument();
  });

  it("surfaces handler errors as query errors", async () => {
    worker.use(
      http.get("/api/msw-smoke", () =>
        HttpResponse.json({ error: "boom" }, { status: 500 })
      )
    );

    const screen = await renderWithQueryClient(<Smoke />);

    await expect
      .element(screen.getByText("request failed", { exact: true }))
      .toBeInTheDocument();
  });
});
