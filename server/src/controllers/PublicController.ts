import { Request, Response } from "express";
import { ResumeService } from "../services/ResumeService";

export class PublicController {
  constructor(private readonly resumeService: ResumeService = new ResumeService()) {}

  getBySlug = async (req: Request, res: Response) => {
    const password = typeof req.query.password === "string" ? req.query.password : undefined;
    const resume = await this.resumeService.getPublicBySlug(req.params.slug, password);
    res.json({ resume: resume.toPublicJSON() });
  };
}
