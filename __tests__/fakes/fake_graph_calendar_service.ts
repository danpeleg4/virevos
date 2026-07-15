import type { GraphCalendarServiceInterface } from "@/api_client/ms_graph/graph_calendar_service";

export type FakeGraphCalendarService = {
  [K in keyof GraphCalendarServiceInterface]: Mock<
    GraphCalendarServiceInterface[K]
  >;
};

export function makeFakeGraphCalendarService(
  overrides: Partial<GraphCalendarServiceInterface> = {}
): FakeGraphCalendarService {
  const fake = {
    createEvent: vi.fn(async () => ({ id: "outlook-evt-new" })),
    updateEvent: vi.fn(async () => {}),
    deleteEvent: vi.fn(async () => {}),
  } satisfies GraphCalendarServiceInterface;

  return Object.assign(fake, overrides) as FakeGraphCalendarService;
}
