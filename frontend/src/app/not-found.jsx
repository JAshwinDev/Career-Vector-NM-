import Link from "next/link";

export default function NotFound() {
  return (
    <section className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <h1 className="font-display text-2xl font-bold text-ink">
        404 — Page not found
      </h1>
      <p className="text-ink-soft">The page you are looking for does not exist.</p>
      <Link
        href="/"
        className="mt-2 rounded-[10px] bg-accent px-5 py-2 font-semibold text-white transition-opacity hover:opacity-90"
      >
        Back home
      </Link>
    </section>
  );
}
