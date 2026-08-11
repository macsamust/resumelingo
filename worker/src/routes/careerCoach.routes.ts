import { Hono } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { requireAuth } from "../middleware/authMiddleware";
import { CareerCoachController } from "../controllers/CareerCoachController";

const careerCoach = new Hono<AppEnv>();
const controller = new CareerCoachController();

careerCoach.use(requireAuth);
careerCoach.post("/ask", controller.ask);

export default careerCoach;
