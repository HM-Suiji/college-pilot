import { AdmissionYear, PAGE_SIZE, RouteYear, SUBJECT_OPTIONS, YEARS } from "./constants";

export type SearchParamsInput = Record<string, string | string[] | undefined>;

export type Filters = {
  year: RouteYear;
  provinces: string[];
  batches: string[];
  code: string;
  name: string;
  subject: string;
  major: string;
  groupCode: string;
  minScore: number;
  maxRank: number;
  only2026: boolean;
  hideSports: boolean;
  hideCoop: boolean;
  page: number;
  error: string;
};

const FILTER_KEYS = [
  "province",
  "batch",
  "code",
  "name",
  "subject",
  "major",
  "groupCode",
  "minScore",
  "maxRank",
  "only2026",
  "hideSports",
  "hideCoop",
  "page",
] as const;

export function normalizeYear(value: string | undefined): RouteYear | null {
  if (!value || value === "all") return "all";
  return (YEARS as readonly string[]).includes(value) ? (value as AdmissionYear) : null;
}

export function parseFilters(year: RouteYear, searchParams: SearchParamsInput): Filters {
  const minScore = parseNonNegativeNumber(searchParams.minScore);
  const maxRank = parseNonNegativeNumber(searchParams.maxRank);
  const yearIsPlanOnly = year === "2026";
  const error = [minScore.error, maxRank.error].filter(Boolean).join("，");

  return {
    year,
    provinces: values(searchParams.province),
    batches: values(searchParams.batch),
    code: value(searchParams.code).trim(),
    name: value(searchParams.name).trim(),
    subject: normalizeSubject(value(searchParams.subject)),
    major: value(searchParams.major).trim(),
    groupCode: value(searchParams.groupCode).trim(),
    minScore: yearIsPlanOnly ? 0 : minScore.value,
    maxRank: yearIsPlanOnly ? 0 : maxRank.value,
    only2026: flag(searchParams.only2026),
    hideSports: flag(searchParams.hideSports),
    hideCoop: flag(searchParams.hideCoop),
    page: Math.max(1, parseInt(value(searchParams.page), 10) || 1),
    error,
  };
}

export function visibleLimit(page: number): number {
  return Math.max(1, page) * PAGE_SIZE;
}

export function makeHref(
  year: RouteYear,
  filters: Filters,
  updates: Partial<Record<(typeof FILTER_KEYS)[number], string | string[] | number | boolean | null>>,
): string {
  const params = new URLSearchParams();
  appendMany(params, "province", filters.provinces);
  appendMany(params, "batch", filters.batches);
  setIf(params, "code", filters.code);
  setIf(params, "name", filters.name);
  setIf(params, "subject", filters.subject);
  setIf(params, "major", filters.major);
  setIf(params, "groupCode", filters.groupCode);
  setIf(params, "minScore", filters.minScore || "");
  setIf(params, "maxRank", filters.maxRank || "");
  setIf(params, "only2026", filters.only2026 ? "1" : "");
  setIf(params, "hideSports", filters.hideSports ? "1" : "");
  setIf(params, "hideCoop", filters.hideCoop ? "1" : "");
  setIf(params, "page", filters.page > 1 ? String(filters.page) : "");

  for (const [key, update] of Object.entries(updates)) {
    params.delete(key);
    if (update === null || update === false || update === "") continue;
    if (Array.isArray(update)) {
      appendMany(params, key, update);
    } else if (update === true) {
      params.set(key, "1");
    } else {
      params.set(key, String(update));
    }
  }

  if (params.get("page") === "1") params.delete("page");
  const query = params.toString();
  return `/${year}${query ? `?${query}` : ""}`;
}

function values(input: string | string[] | undefined): string[] {
  const raw = Array.isArray(input) ? input : input ? input.split(",") : [];
  return raw.map((item) => item.trim()).filter(Boolean);
}

function value(input: string | string[] | undefined): string {
  return Array.isArray(input) ? input[0] ?? "" : input ?? "";
}

function flag(input: string | string[] | undefined): boolean {
  const raw = value(input).toLowerCase();
  return raw === "1" || raw === "true" || raw === "on" || raw === "yes";
}

function parseNonNegativeNumber(input: string | string[] | undefined): { value: number; error: string } {
  const raw = value(input).trim();
  if (!raw) return { value: 0, error: "" };
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { value: 0, error: "请检查最低分和最低排名" };
  }
  return { value: parsed, error: "" };
}

function normalizeSubject(input: string): string {
  return SUBJECT_OPTIONS.some((option) => option.value === input) ? input : "";
}

function appendMany(params: URLSearchParams, key: string, valuesToAppend: string[]): void {
  for (const item of valuesToAppend) {
    if (item) params.append(key, item);
  }
}

function setIf(params: URLSearchParams, key: string, valueToSet: string | number): void {
  const normalized = String(valueToSet);
  if (normalized) params.set(key, normalized);
}
