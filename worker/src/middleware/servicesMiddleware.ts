import { createMiddleware } from "hono/factory";
import { Env } from "../types";
import { createServices, Services } from "../services/createServices";

export type AppEnv = { Bindings: Env; Variables: { services: Services; user?: import("../models/User").User } };

/** Attaches a fresh set of services (wired to this request's D1 binding) to context. */
export const withServices = createMiddleware<AppEnv>(async (c, next) => {
  c.set("services", createServices(c.env));
  await next();
});
