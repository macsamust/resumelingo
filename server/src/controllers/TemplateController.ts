import { Request, Response } from "express";
import { TEMPLATES } from "../config/templates";

export class TemplateController {
  list = async (_req: Request, res: Response) => {
    res.json({ templates: TEMPLATES });
  };
}
