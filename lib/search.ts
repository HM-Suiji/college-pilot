import { cacheLife, cacheTag } from "next/cache";

import { AdmissionData, AdmissionRecord, getAdmissionData, getCachedAdmissionData, MergedRecord } from "./data";
import { Filters } from "./filters";

export type GroupedResult = MergedRecord & {
  isGrouped: true;
};

export type SingleResult = AdmissionRecord & {
  isGrouped: false;
};

export type SearchResult = GroupedResult | SingleResult;

export type SearchOutput = {
  grouped: boolean;
  total: number;
  items: SearchResult[];
};

export function searchAdmissions(filters: Filters): SearchOutput {
  return searchAdmissionsWithData(filters, getAdmissionData());
}

export async function searchAdmissionsCached(filters: Filters): Promise<SearchOutput> {
  "use cache";

  cacheLife({
    stale: 60 * 60 * 24 * 365,
    revalidate: 60 * 60 * 24 * 365,
    expire: 60 * 60 * 24 * 365 * 2,
  });
  cacheTag("admissions", "admissions:search", `admissions:year:${filters.year}`);

  return searchAdmissionsWithData(filters, await getCachedAdmissionData());
}

function searchAdmissionsWithData(filters: Filters, data: AdmissionData): SearchOutput {
  if (filters.error) {
    return { grouped: filters.year === "all", total: 0, items: [] };
  }

  if (filters.year === "all") {
    const items = searchMerged(filters, data).map((item) => ({
      ...item,
      isGrouped: true as const,
    }));
    return { grouped: true, total: items.length, items };
  }

  const items = searchSingleYear(filters, data).map((item) => ({
    ...item,
    isGrouped: false as const,
  }));
  return { grouped: false, total: items.length, items };
}

function searchMerged(filters: Filters, data: AdmissionData): MergedRecord[] {
  const provinces = filters.provinces.length ? new Set(filters.provinces) : null;
  const results: MergedRecord[] = [];

  for (const item of data.merged) {
    if (provinces && !provinces.has(item.province)) continue;
    if (filters.code && !item.schoolCode.includes(filters.code)) continue;
    if (filters.name && !item.schoolName.includes(filters.name)) continue;
    if (filters.subject && item.subjectCode !== filters.subject) continue;
    if (filters.major && !item.majorName.includes(filters.major)) continue;
    if (filters.groupCode && !item.groupCode.includes(filters.groupCode)) continue;
    if (filters.hideSports && (item.majorName.includes("体育") || item.schoolName.includes("体育"))) continue;
    if (filters.hideCoop && (item.majorName.includes("中外合作") || item.remark.includes("中外合作"))) continue;
    if (filters.only2026 && !item.y2026) continue;
    if (filters.batches.length && !filters.batches.includes(item.batch)) continue;

    const filtered = filterMergedScores(item, filters);
    if (filtered) results.push(filtered);
  }

  return results.sort((a, b) => {
    const hasScoreA = Boolean(a.y2024 || a.y2025);
    const hasScoreB = Boolean(b.y2024 || b.y2025);
    if (hasScoreA && !hasScoreB) return -1;
    if (!hasScoreA && hasScoreB) return 1;

    const scoreA = (a.y2025 ?? a.y2024 ?? a.y2026)?.score ?? 0;
    const scoreB = (b.y2025 ?? b.y2024 ?? b.y2026)?.score ?? 0;
    return filters.minScore || filters.maxRank ? scoreA - scoreB : scoreB - scoreA;
  });
}

function filterMergedScores(item: MergedRecord, filters: Filters): MergedRecord | null {
  if (!filters.minScore && !filters.maxRank) return item;

  const keep2024 = passMetric(item.y2024, filters);
  const keep2025 = passMetric(item.y2025, filters);
  const keep2026 = filters.only2026 ? Boolean(item.y2026) : passMetric(item.y2026, filters);

  if (!keep2024 && !keep2025 && !keep2026) return null;

  return {
    ...item,
    y2024: keep2024 ? item.y2024 : null,
    y2025: keep2025 ? item.y2025 : null,
    y2026: keep2026 ? item.y2026 : null,
  };
}

function passMetric(
  metric: { score: number; rank: number } | null,
  filters: Pick<Filters, "minScore" | "maxRank">,
): boolean {
  if (!metric) return false;
  if (filters.minScore && metric.score < filters.minScore) return false;
  if (filters.maxRank && metric.rank > filters.maxRank) return false;
  return true;
}

function searchSingleYear(filters: Filters, data: AdmissionData): AdmissionRecord[] {
  if (filters.year === "all") return [];

  const records = data.byYear[filters.year];
  const provinces = filters.provinces.length ? new Set(filters.provinces) : null;
  const results: AdmissionRecord[] = [];

  for (const item of records) {
    if (filters.minScore && item.score < filters.minScore) continue;
    if (filters.maxRank && item.rank > filters.maxRank) continue;
    if (provinces && !provinces.has(item.province)) continue;
    if (filters.subject && item.subjectCode !== filters.subject) continue;
    if (filters.code && !item.schoolCode.includes(filters.code)) continue;
    if (filters.name && !item.schoolName.includes(filters.name)) continue;
    if (filters.major && !item.majorName.includes(filters.major)) continue;
    if (filters.groupCode && !item.groupCode.includes(filters.groupCode)) continue;
    if (filters.only2026 && item.year !== "2026") continue;
    if (filters.batches.length && !filters.batches.includes(item.batch)) continue;
    if (filters.hideSports && (item.majorName.includes("体育") || item.schoolName.includes("体育"))) continue;
    if (filters.hideCoop && (item.majorName.includes("中外合作") || item.remark.includes("中外合作"))) continue;
    results.push(item);
  }

  return results.sort((a, b) =>
    filters.minScore || filters.maxRank ? a.score - b.score : b.score - a.score,
  );
}
