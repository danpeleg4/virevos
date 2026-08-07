import React from "react";
import { http, HttpResponse } from "msw";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { worker } from "../../../msw/worker";
import { renderWithQueryClient } from "../../../_helpers/render";
import {
  useBilling,
  useBillingOverview,
  useBillingSetupIntent,
  useCancelSubscription,
  useChangePlan,
  useResubscribe,
} from "@/app/workspace/billing/_lib/hooks";
import { billingOverviewFixture } from "../../../msw/handlers/billing";

function BillingHarness({ onSuccess }: { onSuccess: () => void }) {
  const { data } = useQuery<{ paymentMethod?: { last4: string } | null }>({
    queryKey: ["billing"],
    queryFn: () => axios.get("/api/billing").then((r) => r.data),
  });
  const mutation = useBilling({ onSuccess });

  return (
    <div>
      <div>Last4: {data?.paymentMethod?.last4 ?? "none"}</div>
      <button onClick={() => mutation.mutate("pm_new_123")}>Update</button>
      {mutation.isError && <div>Update failed</div>}
    </div>
  );
}

describe("useBilling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts the payment method id, invalidates the billing query, and calls onSuccess", async () => {
    let postBody: unknown;
    let updated = false;
    worker.use(
      http.get("/api/billing", () =>
        HttpResponse.json({
          ...billingOverviewFixture,
          paymentMethod: updated
            ? { brand: "mastercard", last4: "9999", expMonth: 1, expYear: 2031 }
            : billingOverviewFixture.paymentMethod,
        })
      ),
      http.post("/api/billing", async ({ request }) => {
        postBody = await request.json();
        updated = true;
        return HttpResponse.json({ success: true });
      })
    );
    const onSuccess = vi.fn();

    const screen = await renderWithQueryClient(
      <BillingHarness onSuccess={onSuccess} />
    );
    await expect
      .element(screen.getByText("Last4: 4242", { exact: true }))
      .toBeInTheDocument();

    await screen.getByRole("button", { name: "Update" }).click();

    await vi.waitFor(() => {
      expect(postBody).toEqual({
        type: "update-payment-method",
        data: { paymentMethodId: "pm_new_123" },
      });
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    // billing query is invalidated and refetches the updated payment method
    await expect
      .element(screen.getByText("Last4: 9999", { exact: true }))
      .toBeInTheDocument();
  });

  it("does not call onSuccess and surfaces an error when the request fails", async () => {
    worker.use(
      http.get("/api/billing", () => HttpResponse.json(billingOverviewFixture)),
      http.post("/api/billing", () =>
        HttpResponse.json({ error: "card declined" }, { status: 402 })
      )
    );
    const onSuccess = vi.fn();

    const screen = await renderWithQueryClient(
      <BillingHarness onSuccess={onSuccess} />
    );
    await screen.getByRole("button", { name: "Update" }).click();

    await expect
      .element(screen.getByText("Update failed", { exact: true }))
      .toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

describe("useBillingOverview", () => {
  it("loads the billing overview", async () => {
    function Harness() {
      const { data } = useBillingOverview();
      return <div>Plan: {data?.subscription.plan}</div>;
    }
    const screen = await renderWithQueryClient(<Harness />);
    await expect
      .element(screen.getByText("Plan: professional"))
      .toBeInTheDocument();
  });
});

describe("useBillingSetupIntent", () => {
  it("fetches the setup intent secret only when enabled", async () => {
    let fetched = false;
    worker.use(
      http.get("/api/billing/setup-intent", () => {
        fetched = true;
        return HttpResponse.json({ clientSecret: "seti_secret_1" });
      })
    );
    function Harness({ enabled }: { enabled: boolean }) {
      const { data } = useBillingSetupIntent(enabled);
      return <div>{data ?? "none"}</div>;
    }
    await renderWithQueryClient(<Harness enabled={false} />);
    expect(fetched).toBe(false);

    const screen = await renderWithQueryClient(<Harness enabled={true} />);
    await expect.element(screen.getByText("seti_secret_1")).toBeInTheDocument();
  });
});

describe("useChangePlan", () => {
  it("posts the new plan id and invalidates billing", async () => {
    let postBody: unknown;
    let currentPlan = "professional";
    worker.use(
      http.get("/api/billing", () =>
        HttpResponse.json({
          ...billingOverviewFixture,
          subscription: {
            ...billingOverviewFixture.subscription,
            plan: currentPlan,
          },
        })
      ),
      http.post("/api/billing", async ({ request }) => {
        postBody = await request.json();
        currentPlan = "business";
        return HttpResponse.json({ success: true });
      })
    );
    function Harness() {
      const { data } = useBillingOverview();
      const changePlan = useChangePlan();
      return (
        <div>
          <div>Plan: {data?.subscription.plan}</div>
          <button onClick={() => changePlan.mutate("business")}>Change</button>
        </div>
      );
    }
    const screen = await renderWithQueryClient(<Harness />);
    await expect
      .element(screen.getByText("Plan: professional"))
      .toBeInTheDocument();

    await screen.getByRole("button", { name: "Change" }).click();

    await vi.waitFor(() => {
      expect(postBody).toEqual({
        type: "change-plan",
        data: { planId: "business" },
      });
    });
    await expect
      .element(screen.getByText("Plan: business"))
      .toBeInTheDocument();
  });
});

describe("useCancelSubscription", () => {
  it("posts a cancel request and invalidates billing", async () => {
    let postBody: unknown;
    worker.use(
      http.post("/api/billing", async ({ request }) => {
        postBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );
    function Harness() {
      const cancel = useCancelSubscription();
      return <button onClick={() => cancel.mutate()}>Cancel</button>;
    }
    const screen = await renderWithQueryClient(<Harness />);
    await screen.getByRole("button", { name: "Cancel" }).click();

    await vi.waitFor(() => {
      expect(postBody).toEqual({ type: "cancel" });
    });
  });
});

describe("useResubscribe", () => {
  it("posts a resubscribe request and invalidates billing", async () => {
    let postBody: unknown;
    worker.use(
      http.post("/api/billing", async ({ request }) => {
        postBody = await request.json();
        return HttpResponse.json({ success: true });
      })
    );
    function Harness() {
      const resubscribe = useResubscribe();
      return <button onClick={() => resubscribe.mutate()}>Resubscribe</button>;
    }
    const screen = await renderWithQueryClient(<Harness />);
    await screen.getByRole("button", { name: "Resubscribe" }).click();

    await vi.waitFor(() => {
      expect(postBody).toEqual({ type: "resubscribe" });
    });
  });
});
