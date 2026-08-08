import express from "express";
import cors from "cors";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { SubscriptionController } from "./controllers/SubscriptionController";
import { asyncHandler } from "./controllers/asyncHandler";

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));

  // Stripe webhook: must be registered before express.json() and use
  // express.raw() instead, since verifying the `stripe-signature` header
  // requires the exact raw request bytes Stripe signed — a JSON-parsed and
  // re-serialized body would no longer match the signature. Because this
  // exact path+method is matched here first, it never reaches express.json()
  // below.
  const subscriptionController = new SubscriptionController();
  app.post(
    "/api/webhooks/stripe",
    express.raw({ type: "application/json" }),
    asyncHandler(subscriptionController.webhook)
  );

  // Default express.json() body limit (100kb) is too small for a resume
  // with a photo — photoUrl is a base64 data: URL that, even resized and
  // compressed client-side, can run to a few hundred KB. 5mb comfortably
  // covers that with headroom; ResumeService.assertPhotoSizeOk enforces the
  // real ~2MB cap on the photo field itself.
  app.use(express.json({ limit: "5mb" }));

  app.get("/health", (_req, res) => res.json({ status: "ok", service: "websume-server" }));
  app.use("/api", routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
