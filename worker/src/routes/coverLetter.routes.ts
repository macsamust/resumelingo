import { Hono } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { requireAuth } from "../middleware/authMiddleware";
import { CoverLetterController } from "../controllers/CoverLetterController";

const coverLetters = new Hono<AppEnv>();
const controller = new CoverLetterController();

coverLetters.use(requireAuth);
coverLetters.post("/", controller.generate);

export default coverLetters;
