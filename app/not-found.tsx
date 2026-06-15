import Link from "next/link";

export default function NotFoundPage() {
    return (
        <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4 py-10 sm:px-6 lg:px-8">
            <section className="w-full rounded-4xl border border-hairline bg-surface p-8 text-center shadow-card sm:p-10">
                <p className="text-[12px] font-medium uppercase tracking-[0.22em] text-body">
                    404
                </p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tighter text-ink">
                    Page not found
                </h1>
                <p className="mt-4 text-base leading-8 text-body">
                    The page you requested does not exist or the URL may have
                    changed.
                </p>
                <Link
                    href="/"
                    className="mt-6 inline-flex h-11 items-center rounded-pill border border-hairline bg-ink px-5 text-sm font-semibold text-on-primary transition hover:-translate-y-0.5"
                >
                    Back to Daytill home
                </Link>
            </section>
        </main>
    );
}
