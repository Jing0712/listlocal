// Values safe to render in any page. Nothing secret belongs here.
export const freeLimitPublic = Number(process.env.FREE_LISTING_LIMIT ?? 3) || 3;
