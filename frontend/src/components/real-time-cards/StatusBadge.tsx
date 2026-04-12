import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "normal" | "warning" | "critical";
}

const labels = { normal: "Normal", warning: "Warning", critical: "Critical" };

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "normal" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        status === "warning" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
        status === "critical" && "bg-red-500/15 text-red-600 dark:text-red-400"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "normal" && "bg-emerald-500",
          status === "warning" && "bg-amber-500",
          status === "critical" && "bg-red-500"
        )}
      />
      {labels[status]}
    </span>
  );
}