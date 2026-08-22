import { Hono } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { requireAuth } from "../middleware/authMiddleware";
import { ResumeImportController } from "../controllers/ResumeImportController";

const resumeImport = new Hono<AppEnv>();
const controller = new ResumeImportController();

resumeImport.use(requireAuth);
resumeImport.post("/", controller.extract);

export default resumeImport;
