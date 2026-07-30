import { Response } from "express";
import { ResumeService } from "../services/ResumeService";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

export class ResumeController {
  constructor(private readonly resumeService: ResumeService = new ResumeService()) {}

  list = async (req: AuthenticatedRequest, res: Response) => {
    const resumes = this.resumeService.listForUser(req.user!.id);
    res.json({ resumes: resumes.map((r) => r.toJSON()) });
  };

  get = async (req: AuthenticatedRequest, res: Response) => {
    const resume = this.resumeService.getOwned(req.user!.id, req.params.id);
    res.json({ resume: resume.toJSON() });
  };

  create = async (req: AuthenticatedRequest, res: Response) => {
    const { title, profession, templateKey, visibility, accessPassword, answers } = req.body ?? {};
    if (!title || !profession || !templateKey || !answers) {
      return res.status(400).json({ error: "title, profession, templateKey, and answers are required." });
    }
    const resume = this.resumeService.create(req.user!, {
      title,
      profession,
      templateKey,
      visibility,
      accessPassword,
      answers,
    });
    res.status(201).json({ resume: resume.toJSON() });
  };

  update = async (req: AuthenticatedRequest, res: Response) => {
    const resume = this.resumeService.update(req.user!.id, req.params.id, req.body ?? {});
    res.json({ resume: resume.toJSON() });
  };

  remove = async (req: AuthenticatedRequest, res: Response) => {
    this.resumeService.delete(req.user!.id, req.params.id);
    res.status(204).send();
  };
}
