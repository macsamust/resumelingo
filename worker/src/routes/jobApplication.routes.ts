import { Hono } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { requireAuth } from "../middleware/authMiddleware";
import { JobApplicationController } from "../controllers/JobApplicationController";

const jobApplications = new Hono<AppEnv>();
const controller = new JobApplicationController();

jobApplications.use("*", requireAuth);
jobApplications.get("/", controller.list);
jobApplications.post("/", controller.create);
jobApplications.post("/cleanup-stale", controller.cleanupStale);
jobApplications.put("/:id", controller.update);
jobApplications.delete("/:id", controller.remove);

export default jobApplications;
