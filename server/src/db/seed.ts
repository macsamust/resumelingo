// Must be the very first import — see the comment in src/index.ts for why
// `import "dotenv/config"` (not a later `dotenv.config()` call) is required
// under ESM so env vars are loaded before ./database reads DATABASE_URL.
import "dotenv/config";

/**
 * Creates one demo account with a sample resume so the app has something
 * to look at immediately after `npm install`. Safe to re-run — it skips
 * creation if the demo account already exists.
 */
import { migrate } from "./database";
import { AuthService, AuthError } from "../services/AuthService";
import { ResumeService } from "../services/ResumeService";
import { TemplateRepository } from "../repositories/TemplateRepository";
import { PlanRepository } from "../repositories/PlanRepository";
import { LinkVisibility } from "../types";
import { User } from "../models/User";

async function getOrCreateDemoUser(authService: AuthService, email: string, password: string): Promise<User> {
  try {
    const { user } = await authService.register({ name: "Jordan Lee", email, password, profession: "software-engineer" });
    console.log(`Created demo user: ${email} / ${password}`);
    return user;
  } catch (err) {
    if (!(err instanceof AuthError)) throw err;
    const { user } = await authService.login(email, password);
    console.log("Demo user already exists — reusing it.");
    return user;
  }
}

async function seed() {
  await migrate();
  await new TemplateRepository().refreshCache();
  await new PlanRepository().refreshCache();

  const authService = new AuthService();
  const resumeService = new ResumeService();

  const demoEmail = "demo@resumelingo.app";
  const demoPassword = "password123";

  const user = await getOrCreateDemoUser(authService, demoEmail, demoPassword);

  const resume = await resumeService.create(user, {
    title: "Cloud Architect Resume",
    profession: "software-engineer",
    templateKey: "technical",
    visibility: LinkVisibility.Public,
    answers: {
      languages: "TypeScript, C#, Python",
      frameworks: "React, .NET, Django",
      cloudPlatforms: "Azure, AWS",
      certifications: "Azure Solutions Architect Expert",
      yearsExperience: "10",
    },
  });

  console.log(`Created demo resume: ${resume.title} → /r/${resume.slug}`);
  console.log("Seed complete.");
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit();
  });
