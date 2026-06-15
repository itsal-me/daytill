import Link from "next/link";
import type { ReactNode } from "react";

export function UpgradeGate({
    feature,
    children,
    isPro,
    isSignedIn,
}: {
    feature: string;
    children: ReactNode;
    isPro: boolean;
    isSignedIn: boolean;
}) {
    if (isPro) return <>{children}</>;

    return (
        <div className="relative">
            <div className="pointer-events-none select-none opacity-40">
                {children}
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[inherit] bg-surface/80 backdrop-blur-sm">
                <span
                    className="material-symbols-outlined text-body"
                    style={{ fontSize: "24px" }}
                    aria-hidden="true"
                >
                    lock
                </span>
                <p className="text-center text-sm font-medium text-ink">
                    {feature} is a{" "}
                    <span className="font-semibold">Pro</span> feature
                </p>
                {!isSignedIn && (
                    <p className="max-w-[18rem] text-center text-xs text-body">
                        Sign in first, then upgrade to Pro.
                    </p>
                )}
                <Link
                    href="/pricing"
                    className="inline-flex h-8 items-center rounded-pill bg-primary px-4 text-xs font-semibold text-primary-foreground transition hover:bg-primary-hover"
                >
                    Upgrade to Pro
                </Link>
            </div>
        </div>
    );
}

export function ProBadge() {
    return (
        <span className="rounded-full border border-hairline bg-canvas-soft-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-mute">
            Pro
        </span>
    );
}
