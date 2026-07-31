import type { ReactNode } from "react";
import clsx from "clsx";

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950",
        padded && "p-6",
        className
      )}
    >
      {children}
    </div>
  );
}
