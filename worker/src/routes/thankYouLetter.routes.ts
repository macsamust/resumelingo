import { Hono } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { requireAuth } from "../middleware/authMiddleware";
import { ThankYouLetterController } from "../controllers/ThankYouLetterController";

const thankYouLetters = new Hono<AppEnv>();
const controller = new ThankYouLetterController();

thankYouLetters.use(requireAuth);
thankYouLetters.get("/scenarios", controller.scenarios);
thankYouLetters.post("/", controller.generate);

export default thankYouLetters;
