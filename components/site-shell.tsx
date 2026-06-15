"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

const navLinks = [
    { href: "/", label: "App" },
    { href: "/pricing", label: "Pricing" },
    { href: "/about-us", label: "About" },
] as const;

const footerLinks = {
    Product: [
        { href: "/", label: "Countdown App" },
        { href: "/pricing", label: "Pricing" },
    ],
    Company: [
        { href: "/about-us", label: "About" },
        { href: "/contact-us", label: "Contact" },
    ],
    Legal: [
        { href: "/privacy-policy", label: "Privacy Policy" },
        { href: "/terms-and-conditions", label: "Terms" },
    ],
} as const;

const THEME_KEY = "daytill.theme";

export function SiteShell({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [theme, setTheme] = useState<"light" | "dark">("light");

    function handleThemeToggle() {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        document.documentElement.classList.toggle("dark", next === "dark");
        document.documentElement.style.colorScheme = next;
        window.localStorage.setItem(THEME_KEY, next);
    }

    return (
        <>
            <header className="sticky top-0 h-16 z-40 border-b border-hairline/80 bg-page/85 backdrop-blur-xl">
                <div className="mx-auto flex w-full max-w-350 items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
                    <Link
                        href="/"
                        className="flex items-center gap-2.5 shrink-0"
                        onClick={() => setMobileOpen(false)}
                    >
                        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white dark:bg-gray-800 shadow-card">
                            <span className="material-symbols-outlined">
                                upcoming
                            </span>
                        </span>
                        <span className="text-sm font-semibold tracking-[-0.04em] text-ink">
                            Daytill
                        </span>
                    </Link>

                    <nav
                        aria-label="Site"
                        className="hidden items-center gap-1 md:flex"
                    >
                        {navLinks.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                                    pathname === item.href
                                        ? "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--daytill-hairline)]"
                                        : "text-body hover:text-ink"
                                }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="hidden items-center gap-2 md:flex">
                        {/* <Link
                            href="/"
                            className="inline-flex h-7 items-center rounded-md border border-hairline bg-surface px-3 text-[13px] font-medium text-ink transition hover:border-hairline-strong"
                        >
                            Log in
                        </Link> */}

                        <button
                            type="button"
                            disabled
                            className="inline-flex h-9 items-center gap-2 rounded-pill border border-hairline bg-surface px-4 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:border-hairline-strong disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <GoogleIcon />
                            Sign in
                        </button>

                        <Link
                            href="/#event-form"
                            className="inline-flex h-7 items-center rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground transition hover:bg-primary-hover"
                        >
                            Start free
                        </Link>
                        <button
                            type="button"
                            onClick={handleThemeToggle}
                            className="inline-flex h-9 items-center rounded-pill border border-hairline bg-surface px-4 text-sm font-medium text-ink transition hover:-translate-y-0.5 hover:border-hairline-strong"
                        >
                            {theme === "dark" ? (
                                <span className="material-symbols-outlined">
                                    light_mode
                                </span>
                            ) : (
                                <span className="material-symbols-outlined">
                                    dark_mode
                                </span>
                            )}
                        </button>
                    </div>

                    <button
                        type="button"
                        aria-label={mobileOpen ? "Close menu" : "Open menu"}
                        onClick={() => setMobileOpen((v) => !v)}
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-hairline text-ink transition hover:border-hairline-strong md:hidden"
                    >
                        {mobileOpen ? (
                            <svg
                                viewBox="0 0 16 16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                className="h-4 w-4"
                                aria-hidden="true"
                            >
                                <path
                                    d="M3 3l10 10M13 3L3 13"
                                    strokeLinecap="round"
                                />
                            </svg>
                        ) : (
                            <svg
                                viewBox="0 0 16 16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                className="h-4 w-4"
                                aria-hidden="true"
                            >
                                <path
                                    d="M2 4h12M2 8h12M2 12h12"
                                    strokeLinecap="round"
                                />
                            </svg>
                        )}
                    </button>
                </div>

                {mobileOpen && (
                    <div className="border-t border-hairline/60 bg-page/95 backdrop-blur-xl md:hidden">
                        <nav className="mx-auto flex w-full max-w-350 flex-col gap-1 px-4 py-4 sm:px-6">
                            {navLinks.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                                        pathname === item.href
                                            ? "bg-surface text-ink"
                                            : "text-body hover:text-ink"
                                    }`}
                                >
                                    {item.label}
                                </Link>
                            ))}
                            <div className="mt-3 flex gap-2 border-t border-hairline/60 pt-3">
                                <Link
                                    href="/"
                                    onClick={() => setMobileOpen(false)}
                                    className="inline-flex h-9 flex-1 items-center justify-center rounded-md border border-hairline bg-surface text-sm font-medium text-ink"
                                >
                                    Log in
                                </Link>
                                <Link
                                    href="/"
                                    onClick={() => setMobileOpen(false)}
                                    className="inline-flex h-9 flex-1 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground"
                                >
                                    Start free
                                </Link>
                            </div>
                        </nav>
                    </div>
                )}
            </header>

            {children}

            <footer className="border-t border-hairline/80 bg-page">
                <div className="mx-auto w-full max-w-350 px-4 py-12 sm:px-6 lg:px-8">
                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
                        <div>
                            <Link
                                href="/"
                                className="flex items-center gap-2.5"
                            >
                                <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white dark:bg-gray-800 shadow-card">
                                    <span className="material-symbols-outlined">
                                        upcoming
                                    </span>
                                </span>
                                <span className="text-sm font-semibold tracking-[-0.04em] text-ink">
                                    Daytill
                                </span>
                            </Link>
                            <p className="mt-4 max-w-xs text-sm leading-6 text-body">
                                A local-first countdown app for birthdays,
                                exams, deadlines, trips, and anniversaries.
                            </p>
                        </div>

                        {Object.entries(footerLinks).map(([group, links]) => (
                            <div key={group}>
                                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-mute">
                                    {group}
                                </p>
                                <ul className="mt-3 space-y-2">
                                    {links.map((item) => (
                                        <li key={item.href}>
                                            <Link
                                                href={item.href}
                                                className="text-sm text-body transition hover:text-ink"
                                            >
                                                {item.label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 border-t border-hairline/60 pt-6">
                        <p className="text-[12px] text-mute">
                            &copy; {new Date().getFullYear()} Daytill. All
                            rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </>
    );
}

function GoogleIcon() {
    return (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5">
                <path
                    fill="#4285F4"
                    d="M12 10.2v3.9h5.5c-.2 1.2-1.4 3.5-5.5 3.5-3.3 0-6-2.8-6-6.2S8.7 5.2 12 5.2c1.9 0 3.2.8 4 1.5l2.7-2.6C16.1 2.5 14.2 1.7 12 1.7 6.8 1.7 2.6 5.9 2.6 11.1S6.8 20.5 12 20.5c6.7 0 8.9-4.7 8.9-7.1 0-.5-.1-.9-.1-1.2H12Z"
                />
            </svg>
        </span>
    );
}
