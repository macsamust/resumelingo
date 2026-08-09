import { Router } from "express";
import authRoutes from "./auth.routes";
import resumeRoutes from "./resume.routes";
import professionRoutes from "./profession.routes";
import templateRoutes from "./template.routes";
import publicRoutes from "./public.routes";
import dashboardRoutes from "./dashboard.routes";
import subscriptionRoutes from "./subscription.routes";
import adminRoutes from "./admin.routes";
import thankYouLetterRoutes from "./thankYouLetter.routes";
import careerCoachRoutes from "./careerCoach.routes";

const router = Router();

router.use("/admin", adminRoutes);
router.use("/auth", authRoutes);
router.use("/resumes", resumeRoutes);
router.use("/professions", professionRoutes);
router.use("/templates", templateRoutes);
router.use("/public", publicRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/subscriptions", subscriptionRoutes);
router.use("/thank-you-letters", thankYouLetterRoutes);
router.use("/career-coach", careerCoachRoutes);

export default router;
