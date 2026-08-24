import { Hono } from "hono";
import { AppEnv } from "../middleware/servicesMiddleware";
import { requireAuth } from "../middleware/authMiddleware";
import { AuthController } from "../controllers/AuthController";

const auth = new Hono<AppEnv>();
const controller = new AuthController();

auth.post("/register", controller.register);
auth.post("/login", controller.login);
auth.post("/forgot-password", controller.forgotPassword);
auth.post("/reset-password", controller.resetPassword);
auth.get("/me", requireAuth, controller.me);
auth.put("/me", requireAuth, controller.updateProfile);
auth.put("/me/password", requireAuth, controller.changePassword);
auth.put("/me/email-preferences", requireAuth, controller.updateEmailPreferences);
// Public — reached from an email link, not from a logged-in session. See
// AuthController.unsubscribeDigest for why this is a POST (from a client
// button click) rather than a bare GET link.
auth.post("/unsubscribe-digest", controller.unsubscribeDigest);
// Public — reached from the verification email's link, not a logged-in session.
auth.post("/verify-email", controller.verifyEmail);
auth.post("/resend-verification", requireAuth, controller.resendVerification);

export default auth;
