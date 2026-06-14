import Link from "next/link";
import type { ReactNode } from "react";

const shellLinks = [
    { href: "/about-us", label: "About" },
    { href: "/contact-us", label: "Contact" },
    { href: "/privacy-policy", label: "Privacy" },
    { href: "/terms-and-conditions", label: "Terms" },
] as const;

export function SiteShell({ children }: { children: ReactNode }) {
    return (
        <>
            <header className="sticky top-0 z-40 border-b border-hairline/80 bg-page/85 backdrop-blur-xl">
                <div className="mx-auto flex w-full max-w-350 items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                    <Link href="/" className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-card">
                            D
                        </span>
                        <span className="flex flex-col leading-tight">
                            <span className="text-sm font-semibold tracking-[-0.04em] text-ink">
                                Daytill
                            </span>
                            <span className="text-[11px] uppercase tracking-[0.22em] text-body">
                                Countdowns and reminders
                            </span>
                        </span>
                    </Link>

                    <nav
                        aria-label="Site"
                        className="hidden flex-wrap items-center gap-2 md:flex"
                    >
                        {shellLinks.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="rounded-pill border border-hairline bg-surface px-3 py-1.5 text-xs font-medium tracking-[0.16em] text-body uppercase transition hover:border-hairline-strong hover:text-ink"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </header>

            {children}

            <footer className="border-t border-hairline/80 bg-page">
                <div className="mx-auto flex w-full max-w-350 flex-col gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
                    <div>
                        <p className="text-sm font-semibold tracking-[-0.03em] text-ink">
                            Daytill
                        </p>
                        <p className="mt-1 max-w-xl text-sm leading-6 text-body">
                            A local-first countdown app for birthdays, exams,
                            deadlines, trips, and anniversaries.
                        </p>
                    </div>

                    <nav aria-label="Footer" className="flex flex-wrap gap-2">
                        {shellLinks.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="rounded-pill border border-hairline bg-surface px-3 py-1.5 text-xs font-medium tracking-[0.16em] text-body uppercase transition hover:border-hairline-strong hover:text-ink"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </footer>
        </>
    );
}
