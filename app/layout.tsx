import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { SiteShell } from "@/components/site-shell";
import "./globals.css";

const geistSans = Geist({
    subsets: ["latin"],
    variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
    subsets: ["latin"],
    variable: "--font-geist-mono",
});

export const metadata: Metadata = {
    title: {
        default: "Daytill",
        template: "%s | Daytill",
    },
    description:
        "Daytill helps you track countdowns to birthdays, exams, deadlines, trips, and anniversaries with live timers, reminders, and shareable event pages.",
    keywords: [
        "countdown app",
        "event timer",
        "birthday countdown",
        "deadline reminder",
        "exam countdown",
        "shareable countdown",
    ],
    openGraph: {
        title: "Daytill",
        description:
            "Track countdowns to important events with live timers and reminder options.",
        type: "website",
        locale: "en_US",
    },
    robots: {
        index: true,
        follow: true,
    },
};

const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('daytill.theme');
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored || (systemDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  } catch (error) {}
})();
`;

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const gaId = process.env.NEXT_PUBLIC_GA_ID;

    return (
        <html
            lang="en"
            suppressHydrationWarning
            className={`${geistSans.variable} ${geistMono.variable}`}
        >
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeScript }} />
                {gaId ? (
                    <>
                        <Script
                            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
                            strategy="afterInteractive"
                        />
                        <Script id="ga-setup" strategy="afterInteractive">
                            {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${gaId}');`}
                        </Script>
                    </>
                ) : null}
            </head>
            <body className="min-h-screen bg-page text-ink antialiased">
                <SiteShell>{children}</SiteShell>
            </body>
        </html>
    );
}
