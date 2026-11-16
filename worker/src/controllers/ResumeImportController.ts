import { Context } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { SubscriptionTier } from "../types";

import { MAX_INPUT_CHARS } from "../services/ResumeImportService";

const MAX_TEXT_LENGTH = MAX_INPUT_CHARS;

/** POST /api/resumes/import — see services/ResumeImportService.ts. Professional/Premium-gated — same tier as Clone and Version History, the closest existing "extra copy of your work" perks. */
export class ResumeImportController {
  extract = async (c: Context<AppEnv>) => {
    const user = c.get("user")!;
    if (user.subscriptionTier !== SubscriptionTier.Professional && user.subscriptionTier !== SubscriptionTier.Premium) {
      return c.json({ error: "Importing a resume requires the Professional or Premium plan. Upgrade to use this tool." }, 403);
    }

    const body = await c.req.json().catch(() => ({}));
    const { text } = (body ?? {}) as { text?: unknown };
    if (typeof text !== "string" || !text.trim()) {
      return c.json({ error: "Resume text is required, nothing to import." }, 400);
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return c.json({ error: `That file's text is too long (limit is ${MAX_TEXT_LENGTH.toLocaleString()} characters, about 8 to 10 pages). Try removing older roles or extra detail, import that, then add the rest on the Edit Resume page.` }, 400);
    }

    const { resumeImportService } = c.get("services");
    const data = await resumeImportService.extract(text);
    return c.json({ data });
  };
}
