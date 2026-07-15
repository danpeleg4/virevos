import { AxiosError, AxiosHeaders } from "axios";
import { apiErrorMessage } from "@/lib/util/api_error";

function makeAxiosError(data: unknown, status = 400): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError(
    "Request failed with status code " + status,
    "ERR",
    config,
    {},
    {
      data,
      status,
      statusText: "Bad Request",
      headers: {},
      config,
    }
  );
}

describe("apiErrorMessage", () => {
  it("returns the server-provided error message from an axios error", () => {
    const err = makeAxiosError({ error: "name is required" });
    expect(apiErrorMessage(err, "fallback")).toBe("name is required");
  });

  it("falls back to the Error message when the response has no error field", () => {
    const err = makeAxiosError({ ok: false }, 500);
    expect(apiErrorMessage(err, "fallback")).toBe(
      "Request failed with status code 500"
    );
  });

  it("returns a plain Error's message", () => {
    expect(apiErrorMessage(new Error("boom"), "fallback")).toBe("boom");
  });

  it("returns the fallback for non-Error values", () => {
    expect(apiErrorMessage("weird", "fallback")).toBe("fallback");
    expect(apiErrorMessage(undefined, "fallback")).toBe("fallback");
  });

  it("returns the fallback for an Error with an empty message", () => {
    expect(apiErrorMessage(new Error(""), "fallback")).toBe("fallback");
  });
});
