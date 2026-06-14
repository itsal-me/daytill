"use client";

import Link from "next/link";

export default function ErrorPage({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10 sm:px-6 lg:px-8">
            <section className="w-full rounded-4xl border border-hairline bg-surface p-8 text-center shadow-card sm:p-10">
                <p className="text-[12px] font-medium uppercase tracking-[0.22em] text-body">
                    500
                </p>
                <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-ink">
                    Something went wrong
                </h1>
                <p className="mt-4 text-base leading-8 text-body">
                    An unexpected error occurred while loading this page.
                </p>
                {error.digest ? (
                    <p className="mt-3 font-mono text-xs text-mute">
                        Reference: {error.digest}
                    </p>
                ) : null}
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <button
                        type="button"
                        onClick={reset}
                        className="inline-flex h-11 items-center rounded-pill border border-hairline bg-ink px-5 text-sm font-semibold text-on-primary transition hover:-translate-y-0.5"
                    >
                        Try again
                    </button>
                    <Link
                        href="/"
                        className="inline-flex h-11 items-center rounded-pill border border-hairline bg-surface px-5 text-sm font-semibold text-ink transition hover:-translate-y-0.5"
                    >
                        Go home
                    </Link>
                </div>
            </section>
        </main>
    );
}
