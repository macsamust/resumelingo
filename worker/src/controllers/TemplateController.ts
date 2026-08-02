import { Context } from "hono";
import { TEMPLATES } from "../config/templates";

export class TemplateController {
  list = async (c: Context) => {
    return c.json({ templates: TEMPLATES });
  };
}
