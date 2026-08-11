import { Hono } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { requireAuth } from "../middleware/authMiddleware";
import { AuthController } from "../controllers/AuthController";

const auth = new Hono<AppEnv>();
const controller = new AuthController();

auth.post("/register", controller.register);
auth.post("/login", controller.login);
auth.get("/me", requireAuth, controller.me);
auth.put("/me", requireAuth, controller.updateProfile);
auth.put("/me/password", requireAuth, controller.changePassword);

export default auth;
