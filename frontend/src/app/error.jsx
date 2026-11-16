"use client";

// Route-level error boundary: a clean retry screen instead of Next's
// default error page in production.
export default function Error({ error, reset }) {
  return (
    <section className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <h1 className="font-display text-2xl font-bold text-ink">
        Something went wrong
      </h1>
      <p className="text-ink-soft">
        {error?.message || "An unexpected error occurred."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-[10px] bg-accent px-5 py-2 font-semibold text-white transition-opacity hover:opacity-90"
      >
        Try again
      </button>
    </section>
  );
}
