import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    description?: string;
    href?: string;
    variant?: "default" | "warning";
}

export function StatCard({ title, value, icon: Icon, trend, description, href, variant = "default" }: StatCardProps) {
    const content = (
        <>
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-medium text-[var(--muted)] truncate">{title}</p>
                    <p className="mt-1 md:mt-2 text-xl md:text-2xl font-bold text-[var(--foreground)] truncate">{value}</p>
                    {description && (
                        <p className="mt-1 text-[10px] md:text-xs text-[var(--muted)] line-clamp-2">{description}</p>
                    )}
                    {trend && (
                        <div className="mt-1 md:mt-2 flex flex-wrap items-center gap-1">
                            <span
                                className={`text-[10px] md:text-xs font-medium ${trend.isPositive ? "text-[var(--success)]" : "text-[var(--destructive)]"
                                    }`}
                            >
                                {trend.isPositive ? "+" : "-"}
                                {Math.abs(trend.value)}%
                            </span>
                            <span className="text-[10px] md:text-xs text-[var(--muted)] truncate">vs mes anterior</span>
                        </div>
                    )}
                </div>
                <div
                    className={`rounded-lg p-2 md:p-3 shrink-0 ${
                        variant === "warning"
                            ? "bg-[var(--warning)]/10"
                            : "bg-[var(--primary)]/10"
                    }`}
                >
                    <Icon
                        className={`h-4 w-4 md:h-5 md:w-5 ${
                            variant === "warning"
                                ? "text-[var(--warning)]"
                                : "text-[var(--primary)]"
                        }`}
                    />
                </div>
            </div>
        </>
    );

    const cardClass = "rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 md:p-4 shadow-sm transition-shadow hover:shadow-md block";

    if (href) {
        return (
            <Link href={href} className={cardClass}>
                {content}
            </Link>
        );
    }

    return <div className={cardClass}>{content}</div>;
}
