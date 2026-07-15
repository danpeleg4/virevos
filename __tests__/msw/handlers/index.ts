import type { RequestHandler } from "msw";
import { userHandlers } from "./user";
import { tasksHandlers } from "./tasks";
import { casesHandlers } from "./cases";
import { billingHandlers } from "./billing";
import { clientsHandlers } from "./clients";
import { eventsHandlers } from "./events";
import { portalHandlers } from "./portal";
import { outlookHandlers } from "./outlook";
import { aiHandlers } from "./ai";

// Default happy-path handlers, one file per feature (spread them here as
// features migrate to MSW). Tests override per-case via worker.use(...).
export const handlers: RequestHandler[] = [
  ...userHandlers,
  ...tasksHandlers,
  ...casesHandlers,
  ...billingHandlers,
  ...clientsHandlers,
  ...eventsHandlers,
  ...portalHandlers,
  ...outlookHandlers,
  ...aiHandlers,
];
