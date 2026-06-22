import Link from "next/link";

import { RouteYear } from "@/lib/constants";
import { Filters, makeHref } from "@/lib/filters";

const YEARS: Array<{ label: string; value: RouteYear }> = [
  { label: "全部", value: "all" },
  { label: "2024", value: "2024" },
  { label: "2025", value: "2025" },
  { label: "2026", value: "2026" },
];

export function YearTabs({ filters }: { filters: Filters }) {
  return (
    <nav className="year-tabs result-year-tabs" aria-label="年份">
      {YEARS.map((item) => {
        const href = makeHref(item.value, filters, {
          page: null,
          minScore: item.value === "2026" ? null : filters.minScore,
          maxRank: item.value === "2026" ? null : filters.maxRank,
        });

        return (
          <Link
            key={item.value}
            className={`tab${filters.year === item.value ? " active" : ""}`}
            href={href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
