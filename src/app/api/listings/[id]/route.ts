import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { HttpError, route } from "@/lib/http";

export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  if (!ObjectId.isValid(id)) throw new HttpError(404, "Listing not found");
  const { listings } = await collections();
  // userId in the filter: users can only ever read their own listings.
  const doc = await listings.findOne({ _id: new ObjectId(id), userId: user._id });
  if (!doc) throw new HttpError(404, "Listing not found");
  const { _id, userId: _u, ...rest } = doc;
  return NextResponse.json({ id: _id.toHexString(), ...rest });
});
