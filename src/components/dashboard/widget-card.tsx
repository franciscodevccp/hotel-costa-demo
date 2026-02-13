import Link from "next/link";

interface WidgetCardProps {
    title: string;
    children: React.ReactNode;
    action?: React.ReactNode;
    href?: string;
}

export function WidgetCard({ title, children, action, href }: WidgetCardProps) {
    return (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
                {(action || href) && (
                    <div className="flex items-center gap-2">
                        {action}
                        {href && (
                            <Link
                                href={href}
                                className="text-xs font-medium text-[var(--primary)] hover:underline"
                            >
                                Ver más
                            </Link>
                        )}
                    </div>
                )}
            </div>
            <div className="p-4">{children}</div>
        </div>
    );
}
