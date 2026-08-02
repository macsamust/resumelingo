import { Hono } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { requireAuth } from "../middleware/authMiddleware";
import { ResumeController } from "../controllers/ResumeController";

const resumes = new Hono<AppEnv>();
const controller = new ResumeController();

resumes.use("*", requireAuth);
resumes.get("/", controller.list);
resumes.post("/", controller.create);
resumes.get("/:id", controller.get);
resumes.put("/:id", controller.update);
resumes.delete("/:id", controller.remove);

export default resumes;
