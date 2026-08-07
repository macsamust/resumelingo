import { Request, Response } from "express";
import { listTemplates } from "../config/templates";

export class TemplateController {
  list = async (_req: Request, res: Response) => {
    res.json({ templates: listTemplates() });
  };
}
