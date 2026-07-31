import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";
import clsx from "clsx";

export function StatTile({
  label,
  value,
  sublabel,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon: LucideIcon;
  tone?: "neutral" | "good" | "critical";
}) {
  return (
    <Card className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</p>
        <p className="mt-1.5 text-2xl font-semibold text-neutral-900 dark:text-white">{value}</p>
        {sublabel && (
          <p
            className={clsx(
              "mt-1 text-xs",
              tone === "good" && "text-good",
              tone === "critical" && "text-critical",
              tone === "neutral" && "text-neutral-400"
            )}
          >
            {sublabel}
          </p>
        )}
      </div>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
        <Icon className="h-[18px] w-[18px]" />
      </div>
    </Card>
  );
}
