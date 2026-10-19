import "server-only";
import { MongoClient, type Db, type ObjectId, type WithId } from "mongodb";
import { optionalEnv, requireEnv } from "./env";
import type { Issue, Listing } from "./compliance/types";
import type { PipelineResult, Step } from "./ai/pipeline";

export type Plan = "free" | "pro";

// Stored fields; MongoDB adds _id on insert (reads return WithId<...>).
export type UserDoc = WithId<UserFields>;
export type UserFields = {
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  createdAt: Date;
  plan: Plan;
  listingsUsed: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: string;
};

// Stored fields; MongoDB adds _id on insert (reads return WithId<...>).
export type TokenDoc = WithId<TokenFields>;
export type TokenFields = {
  userId: ObjectId;
  tokenHash: string;
  purpose: "verify-email";
  expiresAt: Date;
};

// Stored fields; MongoDB adds _id on insert (reads return WithId<...>).
export type ListingDoc = WithId<ListingFields>;
export type ListingFields = {
  userId: ObjectId;
  createdAt: Date;
  status: "running" | "done" | "failed";
  productName: string;
  input: Record<string, unknown>; // ProductInput without image bytes
  imageCount: number;
  result?: Omit<PipelineResult, "steps">;
  steps: Step[];
  error?: string;
  latencyMs?: number;
};

// Stored fields; MongoDB adds _id on insert (reads return WithId<...>).
export type CheckDoc = WithId<CheckFields>;
export type CheckFields = {
  userId: ObjectId;
  createdAt: Date;
  listing: Listing;
  issues: Issue[];
};

// Reuse one client across hot reloads and warm serverless invocations.
const g = globalThis as unknown as { _mongo?: Promise<MongoClient>; _indexes?: Promise<void> };

export async function getDb(): Promise<Db> {
  if (!g._mongo) {
    const client = new MongoClient(requireEnv("MONGODB_URI"), {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    });
    g._mongo = client.connect().catch((e) => {
      g._mongo = undefined; // let the next request retry instead of caching a failure
      throw e;
    });
  }
  const client = await g._mongo;
  const db = client.db(optionalEnv("MONGODB_DB", "listlocal"));
  if (!g._indexes) {
    g._indexes = ensureIndexes(db).catch((e) => {
      g._indexes = undefined;
      throw e;
    });
  }
  await g._indexes;
  return db;
}

async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("users").createIndex({ stripeCustomerId: 1 }, { sparse: true }),
    db.collection("tokens").createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection("tokens").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("listings").createIndex({ userId: 1, createdAt: -1 }),
    db.collection("checks").createIndex({ userId: 1, createdAt: -1 }),
    db.collection("rateLimits").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("stripeEvents").createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 }),
  ]);
}

export async function collections() {
  const db = await getDb();
  return {
    users: db.collection<UserFields>("users"),
    tokens: db.collection<TokenFields>("tokens"),
    listings: db.collection<ListingFields>("listings"),
    checks: db.collection<CheckFields>("checks"),
    rateLimits: db.collection<{ _id: string; count: number; expiresAt: Date }>("rateLimits"),
    stripeEvents: db.collection<{ _id: string; type: string; createdAt: Date }>("stripeEvents"),
  };
}

export async function pingDb(): Promise<boolean> {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}
