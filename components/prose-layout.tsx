import type { ReactNode } from "react";

export function ProseLayout({
    eyebrow,
    title,
    children,
}: {
    eyebrow: string;
    title: string;
    children: ReactNode;
}) {
    return (
        <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-12 text-ink sm:px-6 lg:px-8">
            <article className="rounded-4xl border border-hairline bg-surface p-8 shadow-card sm:p-10">
                <p className="text-[12px] font-medium uppercase tracking-[0.22em] text-body">
                    {eyebrow}
                </p>
                <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-5xl">
                    {title}
                </h1>
                <div className="prose-content mt-6 space-y-6 text-base leading-8 text-body">
                    {children}
                </div>
            </article>
        </main>
    );
}

export function ProseSection({
    heading,
    children,
}: {
    heading?: string;
    children: ReactNode;
}) {
    return (
        <section className="space-y-3">
            {heading ? (
                <h2 className="text-base font-semibold text-ink">{heading}</h2>
            ) : null}
            {children}
        </section>
    );
}
