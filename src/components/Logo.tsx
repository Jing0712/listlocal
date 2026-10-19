/** Wordmark: a stamped orange tile with 列 ("list") plus the name. Original mark, no third-party branding. */
export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const tile = size === "lg" ? "h-12 w-12 text-2xl" : "h-9 w-9 text-lg";
  const word = size === "lg" ? "text-3xl" : "text-2xl";
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`tao-gradient inline-flex ${tile} items-center justify-center rounded-xl font-extrabold text-white`} aria-hidden>
        列
      </span>
      <span className={`${word} font-extrabold tracking-tight text-tao`}>ListLocal</span>
    </span>
  );
}
