import { toolResultToAction } from "@/lib/util/ai_actions";

describe("toolResultToAction", () => {
  it("maps a created case to a case action with its name", () => {
    const action = toolResultToAction("createCase", {
      kind: "case_created",
      case: { id: 1, name: "H-1B Transfer — Maria Chen" },
      message: "ok",
    });
    expect(action).toEqual({
      tone: "case",
      label: "Created case · H-1B Transfer — Maria Chen",
    });
  });

  it("maps a created task to a task action with its title", () => {
    const action = toolResultToAction("createTask", {
      kind: "task_created",
      task: { id: 5, title: "File the LCA" },
      message: "ok",
    });
    expect(action).toEqual({
      tone: "task",
      label: "Added task · File the LCA",
    });
  });

  it("maps a created client to a client action with its name", () => {
    const action = toolResultToAction("addClient", {
      kind: "clients_updated",
      client: { id: 9, name: "Liu Wei", email: "", phone: "" },
      message: "ok",
    });
    expect(action).toEqual({ tone: "client", label: "Added client · Liu Wei" });
  });

  it("maps a created event to a calendar action with its title", () => {
    const action = toolResultToAction("createEvent", {
      kind: "event_created",
      event: { id: "e1", title: "RFE strategy call" },
      message: "ok",
    });
    expect(action).toEqual({
      tone: "calendar",
      label: "Scheduled · RFE strategy call",
    });
  });

  it("maps update tools to generic labels of the matching tone", () => {
    expect(
      toolResultToAction("updateClient", { kind: "client_updated" })
    ).toEqual({ tone: "client", label: "Updated client details" });
    expect(toolResultToAction("updateCase", { kind: "case_updated" })).toEqual({
      tone: "case",
      label: "Updated case",
    });
    expect(toolResultToAction("updateTask", { kind: "task_updated" })).toEqual({
      tone: "task",
      label: "Updated task",
    });
    expect(
      toolResultToAction("updateEvent", { kind: "event_updated" })
    ).toEqual({ tone: "calendar", label: "Updated event" });
  });

  it("returns null for unknown tools", () => {
    expect(
      toolResultToAction("deleteUniverse", { kind: "whatever" })
    ).toBeNull();
  });

  it("returns null when the result kind does not indicate success", () => {
    expect(toolResultToAction("createCase", { kind: "noop" })).toBeNull();
    expect(toolResultToAction("updateTask", { kind: "noop" })).toBeNull();
    expect(toolResultToAction("addClient", null)).toBeNull();
  });
});
