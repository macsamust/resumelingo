export enum SubscriptionTier {
  Starter = "starter",
  Professional = "professional",
  Premium = "premium",
}

export enum LinkVisibility {
  Public = "public",
  PasswordProtected = "password",
  Private = "private",
}

export interface ProfessionQuestion {
  key: string;
  label: string;
  type: "text" | "textarea" | "list" | "number";
  placeholder?: string;
}

export interface ProfessionDefinition {
  key: string;
  label: string;
  questions: ProfessionQuestion[];
}

export interface TemplateDefinition {
  key: string;
  name: string;
  description: string;
}

export interface SubscriptionPlanDefinition {
  tier: SubscriptionTier;
  name: string;
  priceMonthly: number;
  resumeLimit: number; // -1 = unlimited
  features: string[];
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  profession: string | null;
  subscriptionTier: SubscriptionTier;
  createdAt: string;
}

export interface ResumeRecord {
  id: string;
  userId: string;
  slug: string;
  title: string;
  profession: string;
  templateKey: string;
  visibility: LinkVisibility;
  accessPassword: string | null;
  answers: string; // JSON-serialized Record<string, string>
  generatedSummary: string;
  generatedBullets: string; // JSON-serialized string[]
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
}

/** Cloudflare bindings available on every request (see wrangler.jsonc). */
export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  JWT_SECRET: string;
  CLIENT_ORIGIN: string;
}
