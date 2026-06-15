export function StatCard({
    label,
    value,
    detail,
}: {
    label: string;
    value: string;
    detail: string;
}) {
    return (
        <div className="rounded-3xl border border-hairline bg-surface p-4 shadow-[0_1px_1px_rgba(0,0,0,0.03)]">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-mute">
                {label}
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.06em] text-ink">
                {value}
            </p>
            <p className="mt-1.5 text-sm text-body">{detail}</p>
        </div>
    );
}
