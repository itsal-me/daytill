"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type User } from "@supabase/supabase-js";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { getSupabaseBrowserClient, getUserIsPro } from "@/lib/supabase";

const THEME_KEY = "daytill.theme";

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

type Toast = { id: string; message: string; type: "info" | "error" };

export function SiteShell({ children }: { children: ReactNode }) {
    const supabase = getSupabaseBrowserClient();
    const pathname = usePathname();

    const [mobileOpen, setMobileOpen] = useState(false);
    const [theme, setTheme] = useState<"light" | "dark">("light");
    const [user, setUser] = useState<User | null>(null);
    const [isPro, setIsPro] = useState(false);
    const [authConfigured, setAuthConfigured] = useState(false);
    const [authBusy, setAuthBusy] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);

    // ─── Toast helpers ────────────────────────────────────────────────────────

    const addToast = useCallback(
        (message: string, type: Toast["type"] = "info") => {
            const id = crypto.randomUUID();
            setToasts((prev) => [...prev, { id, message, type }]);
            setTimeout(
                () => setToasts((prev) => prev.filter((t) => t.id !== id)),
                4000,
            );
        },
        [],
    );

    // ─── Theme boot (sync with inline script in layout) ───────────────────────

    useEffect(() => {
        if (typeof window === "undefined") return;
        const stored = window.localStorage.getItem(THEME_KEY);
        const resolved =
            stored === "dark" || stored === "light"
                ? stored
                : window.matchMedia("(prefers-color-scheme: dark)").matches
                  ? "dark"
                  : "light";
        setTheme(resolved);
        // Ensure DOM is in sync (in case layout script didn't run)
        document.documentElement.classList.toggle("dark", resolved === "dark");
        document.documentElement.style.colorScheme = resolved;
    }, []);

    // ─── Auth ─────────────────────────────────────────────────────────────────

    useEffect(() => {
        setAuthConfigured(Boolean(supabase));
        const client = supabase;
        if (!client) return;

        // Non-null after the guard above; captured in closures below
        const c = client;
        let mounted = true;

        async function loadPlan(userId: string) {
            const pro = await getUserIsPro(c, userId);
            if (mounted) setIsPro(pro);
        }

        async function init() {
            const {
                data: { session },
            } = await c.auth.getSession();
            if (!mounted) return;
            const sessionUser = session?.user ?? null;
            setUser(sessionUser);
            if (sessionUser) void loadPlan(sessionUser.id);
            else setIsPro(false);
        }

        void init();

        const {
            data: { subscription },
        } = c.auth.onAuthStateChange((_event, session) => {
            const sessionUser = session?.user ?? null;
            setUser(sessionUser);
            if (sessionUser) void loadPlan(sessionUser.id);
            else setIsPro(false);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [supabase]);

    // ─── Handlers ─────────────────────────────────────────────────────────────

    function handleThemeToggle() {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        document.documentElement.classList.toggle("dark", next === "dark");
        document.documentElement.style.colorScheme = next;
        window.localStorage.setItem(THEME_KEY, next);
    }

    async function signInWithGoogle() {
        if (!supabase) {
            addToast("Supabase not configured.", "error");
            return;
        }
        setAuthBusy(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: window.location.origin },
        });
        if (error) {
            addToast(`Sign-in failed: ${error.message}`, "error");
            setAuthBusy(false);
        }
    }

    async function signOutUser() {
        if (!supabase) return;
        setAuthBusy(true);
        const { error } = await supabase.auth.signOut();
        setAuthBusy(false);
        if (error) addToast(`Sign out failed: ${error.message}`, "error");
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <>
            {/* Toast stack */}
            <div
                aria-live="polite"
                className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2 pointer-events-none"
            >
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-[0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-sm ${
                            t.type === "error"
                                ? "border-error/30 bg-error-soft text-error-deep"
                                : "border-hairline bg-surface/95 text-ink"
                        }`}
                    >
                        <span className="max-w-xs">{t.message}</span>
                        <button
                            type="button"
                            onClick={() =>
                                setToasts((prev) =>
                                    prev.filter((x) => x.id !== t.id),
                                )
                            }
                            aria-label="Dismiss"
                            className="mt-0.5 shrink-0 text-mute hover:text-ink"
                        >
                            <svg
                                viewBox="0 0 12 12"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                className="h-3 w-3"
                            >
                                <path
                                    d="M1 1l10 10M11 1L1 11"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>

            <header className="sticky top-0 z-40 h-16 border-b border-hairline/80 bg-page/85 backdrop-blur-xl">
                <div className="mx-auto flex h-full w-full max-w-350 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                    {/* Logo */}
                    <Link
                        href="/"
                        className="flex shrink-0 items-center gap-2.5"
                        onClick={() => setMobileOpen(false)}
                    >
                        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-ink text-primary-foreground shadow-card">
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: "18px" }}
                                aria-hidden="true"
                            >
                                event_upcoming
                            </span>
                        </span>
                        <span className="text-sm font-semibold tracking-[-0.04em] text-ink">
                            Daytill
                        </span>
                    </Link>

                    {/* Desktop nav */}
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

                    {/* Desktop CTAs */}
                    <div className="hidden items-center gap-2 md:flex">
                        {/* Theme toggle */}
                        <button
                            type="button"
                            onClick={handleThemeToggle}
                            title={
                                theme === "dark"
                                    ? "Switch to light mode"
                                    : "Switch to dark mode"
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-surface text-body transition hover:border-hairline-strong hover:text-ink"
                        >
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: "16px" }}
                                aria-hidden="true"
                            >
                                {theme === "dark" ? "light_mode" : "dark_mode"}
                            </span>
                        </button>

                        {/* Auth */}
                        {authConfigured ? (
                            user ? (
                                <button
                                    type="button"
                                    onClick={signOutUser}
                                    disabled={authBusy}
                                    className="inline-flex h-7 items-center rounded-md border border-hairline bg-surface px-3 text-[13px] font-medium text-ink transition hover:border-hairline-strong disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Sign out
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={signInWithGoogle}
                                    disabled={authBusy}
                                    className="inline-flex h-7 items-center gap-1.5 rounded-md border border-hairline bg-surface px-3 text-[13px] font-medium text-ink transition hover:border-hairline-strong disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <GoogleIcon />
                                    Sign in
                                </button>
                            )
                        ) : null}

                        {/* Start free — hidden for Pro users */}
                        {!isPro && (
                            <Link
                                href="/#event-form"
                                className="inline-flex h-7 items-center rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground transition hover:bg-primary-hover"
                            >
                                Start free
                            </Link>
                        )}
                    </div>

                    {/* Mobile right cluster */}
                    <div className="flex items-center gap-2 md:hidden">
                        <button
                            type="button"
                            onClick={handleThemeToggle}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-hairline bg-surface text-body"
                        >
                            <span
                                className="material-symbols-outlined"
                                style={{ fontSize: "16px" }}
                                aria-hidden="true"
                            >
                                {theme === "dark" ? "light_mode" : "dark_mode"}
                            </span>
                        </button>
                        <button
                            type="button"
                            aria-label={mobileOpen ? "Close menu" : "Open menu"}
                            onClick={() => setMobileOpen((v) => !v)}
                            className="flex h-8 w-8 items-center justify-center rounded-md border border-hairline text-ink"
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
                </div>

                {/* Mobile menu */}
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
                                {authConfigured ? (
                                    user ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMobileOpen(false);
                                                void signOutUser();
                                            }}
                                            disabled={authBusy}
                                            className="inline-flex h-9 flex-1 items-center justify-center rounded-md border border-hairline bg-surface text-sm font-medium text-ink disabled:opacity-60"
                                        >
                                            Sign out
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMobileOpen(false);
                                                void signInWithGoogle();
                                            }}
                                            disabled={authBusy}
                                            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-hairline bg-surface text-sm font-medium text-ink disabled:opacity-60"
                                        >
                                            <GoogleIcon />
                                            Sign in
                                        </button>
                                    )
                                ) : null}
                                {!isPro && (
                                    <Link
                                        href="/#event-form"
                                        onClick={() => setMobileOpen(false)}
                                        className="inline-flex h-9 flex-1 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground"
                                    >
                                        Start free
                                    </Link>
                                )}
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
                                <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-ink text-primary-foreground">
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: "18px" }}
                                        aria-hidden="true"
                                    >
                                        event_upcoming
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
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-surface shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3">
                <path
                    fill="#4285F4"
                    d="M12 10.2v3.9h5.5c-.2 1.2-1.4 3.5-5.5 3.5-3.3 0-6-2.8-6-6.2S8.7 5.2 12 5.2c1.9 0 3.2.8 4 1.5l2.7-2.6C16.1 2.5 14.2 1.7 12 1.7 6.8 1.7 2.6 5.9 2.6 11.1S6.8 20.5 12 20.5c6.7 0 8.9-4.7 8.9-7.1 0-.5-.1-.9-.1-1.2H12Z"
                />
            </svg>
        </span>
    );
}
