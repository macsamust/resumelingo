import { Hono } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { requireAuth } from "../middleware/authMiddleware";
import { AchievementGenerateController } from "../controllers/AchievementGenerateController";

const achievementGenerate = new Hono<AppEnv>();
const controller = new AchievementGenerateController();

achievementGenerate.use(requireAuth);
achievementGenerate.post("/", controller.generate);

export default achievementGenerate;
