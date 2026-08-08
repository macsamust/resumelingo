import { Response } from "express";
import { ResumeService } from "../services/ResumeService";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

export class PublicController {
  constructor(private readonly resumeService: ResumeService = new ResumeService()) {}

  getBySlug = async (req: AuthenticatedRequest, res: Response) => {
    const password = typeof req.query.password === "string" ? req.query.password : undefined;
    const resume = await this.resumeService.getPublicBySlug(req.params.slug, password, req.user?.id);
    res.json({ resume: resume.toPublicJSON() });
  };
}
