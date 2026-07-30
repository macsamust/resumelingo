import { Request, Response } from "express";
import { PROFESSIONS, getProfessionByKey } from "../config/professions";

export class ProfessionController {
  list = async (_req: Request, res: Response) => {
    res.json({ professions: PROFESSIONS.map(({ key, label }) => ({ key, label })) });
  };

  questions = async (req: Request, res: Response) => {
    const profession = getProfessionByKey(req.params.key);
    if (!profession) return res.status(404).json({ error: "Unknown profession." });
    res.json({ profession });
  };
}
