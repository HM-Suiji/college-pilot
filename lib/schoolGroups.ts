import "server-only";

import { AdmissionRecord, getAdmissionData } from "@/lib/data";
import { AdmissionYear, RouteYear, subjectLabel, YEARS } from "@/lib/constants";

export type SchoolGroupSort = "rankAsc" | "rankDesc";

export type SchoolGroupFilters = {
  year: RouteYear;
  code: string;
  name: string;
  province: string;
  subject: string;
  groupCode: string;
  batch: string;
  sort: SchoolGroupSort;
};

export type SchoolMajorDetail = {
  majorName: string;
  plan: string;
  fee: string;
  remark: string;
  count: number;
  score: number | null;
  rank: number | null;
};

export type SchoolGroupDetail = {
  id: string;
  year: AdmissionYear;
  province: string;
  schoolCode: string;
  schoolName: string;
  subjectCode: string;
  subjectText: string;
  groupCode: string;
  batch: string;
  plan: string;
  totalCount: number;
  minimumScore: number | null;
  minimumRank: number | null;
  majors: SchoolMajorDetail[];
};

export function parseSchoolGroupFilters(
  searchParams: Record<string, string | string[] | undefined>,
): SchoolGroupFilters {
  const year = normalizeSchoolYear(value(searchParams.year));

  return {
    year,
    code: value(searchParams.code).trim(),
    name: value(searchParams.name).trim(),
    province: value(searchParams.province).trim(),
    subject: value(searchParams.subject).trim(),
    groupCode: value(searchParams.groupCode).trim(),
    batch: value(searchParams.batch).trim(),
    sort: normalizeSort(value(searchParams.sort)),
  };
}

export function getSchoolGroupDetails(filters: SchoolGroupFilters): SchoolGroupDetail[] {
  const data = getAdmissionData();
  const records = data.records.filter((record) => matchesFilters(record, filters));
  const groups = new Map<string, AdmissionRecord[]>();

  for (const record of records) {
    const key = [
      record.year,
      record.schoolCode,
      record.schoolName,
      record.province,
      record.subjectCode,
      record.groupCode || "未标注专业组",
      record.batch,
    ].join("\u0000");
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }

  return Array.from(groups.values())
    .map((recordsInGroup) => toGroupDetail(recordsInGroup, filters.sort))
    .sort((a, b) => sortGroups(a, b, filters.sort));
}

export function makeSchoolSearchHref(
  filters: SchoolGroupFilters,
  updates: Partial<Record<keyof SchoolGroupFilters, string | null>>,
): string {
  const params = new URLSearchParams();
  const year = updates.year === null ? "all" : updates.year ?? filters.year;
  const code = updates.code === null ? "" : updates.code ?? filters.code;
  const name = updates.name === null ? "" : updates.name ?? filters.name;
  const province = updates.province === null ? "" : updates.province ?? filters.province;
  const subject = updates.subject === null ? "" : updates.subject ?? filters.subject;
  const groupCode = updates.groupCode === null ? "" : updates.groupCode ?? filters.groupCode;
  const batch = updates.batch === null ? "" : updates.batch ?? filters.batch;
  const sort = normalizeSort(updates.sort === null ? "" : updates.sort ?? filters.sort);

  setIf(params, "year", year === "all" ? "" : year);
  setIf(params, "code", code);
  setIf(params, "name", name);
  setIf(params, "province", province);
  setIf(params, "subject", subject);
  setIf(params, "groupCode", groupCode);
  setIf(params, "batch", batch);
  setIf(params, "sort", sort === "rankAsc" ? "" : sort);

  const query = params.toString();
  return `/school${query ? `?${query}` : ""}`;
}

function matchesFilters(record: AdmissionRecord, filters: SchoolGroupFilters): boolean {
  if (filters.year !== "all" && record.year !== filters.year) return false;
  if (filters.code && !record.schoolCode.includes(filters.code)) return false;
  if (filters.name && !record.schoolName.includes(filters.name)) return false;
  if (filters.province && record.province !== filters.province) return false;
  if (filters.subject && record.subjectCode !== filters.subject) return false;
  if (filters.groupCode && !record.groupCode.includes(filters.groupCode)) return false;
  if (filters.batch && record.batch !== filters.batch) return false;
  return true;
}

function toGroupDetail(records: AdmissionRecord[], sort: SchoolGroupSort): SchoolGroupDetail {
  const [first] = records;
  const floorRecord = records
    .filter((record) => record.year !== "2026" && record.score > 0 && record.rank > 0)
    .sort((a, b) => a.score - b.score || b.rank - a.rank)[0];

  return {
    id: [
      first.year,
      first.schoolCode,
      first.subjectCode,
      first.groupCode || "未标注专业组",
      first.batch,
    ].join("-"),
    year: first.year,
    province: first.province,
    schoolCode: first.schoolCode,
    schoolName: first.schoolName,
    subjectCode: first.subjectCode,
    subjectText: subjectLabel(first.subjectCode),
    groupCode: first.groupCode || "未标注专业组",
    batch: first.batch,
    plan: first.plan,
    totalCount: records.reduce((sum, record) => sum + record.count, 0),
    minimumScore: floorRecord?.score ?? null,
    minimumRank: floorRecord?.rank ?? null,
    majors: records.map(toMajorDetail).sort((a, b) => sortMajors(a, b, sort)),
  };
}

function toMajorDetail(record: AdmissionRecord): SchoolMajorDetail {
  return {
    majorName: record.majorName,
    plan: record.plan,
    fee: record.fee,
    remark: record.remark,
    count: record.count,
    score: record.year === "2026" || record.score <= 0 ? null : record.score,
    rank: record.year === "2026" || record.rank <= 0 ? null : record.rank,
  };
}

function sortGroups(a: SchoolGroupDetail, b: SchoolGroupDetail, sort: SchoolGroupSort): number {
  return compareNullableRanks(a.minimumRank, b.minimumRank, sort)
    || yearWeight(a.year) - yearWeight(b.year)
    || a.schoolName.localeCompare(b.schoolName, "zh-Hans-CN")
    || a.groupCode.localeCompare(b.groupCode, "zh-Hans-CN", { numeric: true })
    || a.subjectText.localeCompare(b.subjectText, "zh-Hans-CN")
    || a.batch.localeCompare(b.batch, "zh-Hans-CN");
}

function sortMajors(a: SchoolMajorDetail, b: SchoolMajorDetail, sort: SchoolGroupSort): number {
  const rankDiff = compareNullableRanks(a.rank, b.rank, sort);
  if (rankDiff) return rankDiff;

  const scoreA = a.score ?? Number.MAX_SAFE_INTEGER;
  const scoreB = b.score ?? Number.MAX_SAFE_INTEGER;
  return scoreA - scoreB || a.majorName.localeCompare(b.majorName, "zh-Hans-CN");
}

function compareNullableRanks(a: number | null, b: number | null, sort: SchoolGroupSort): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return sort === "rankAsc" ? a - b : b - a;
}

function yearWeight(year: AdmissionYear): number {
  if (year === "2025") return 0;
  if (year === "2024") return 1;
  return 2;
}

function normalizeSchoolYear(input: string): RouteYear {
  if (!input || input === "all") return "all";
  return (YEARS as readonly string[]).includes(input) ? (input as AdmissionYear) : "all";
}

function normalizeSort(input: string): SchoolGroupSort {
  return input === "rankDesc" ? "rankDesc" : "rankAsc";
}

function value(input: string | string[] | undefined): string {
  return Array.isArray(input) ? input[0] ?? "" : input ?? "";
}

function setIf(params: URLSearchParams, key: string, valueToSet: string): void {
  if (valueToSet) params.set(key, valueToSet);
}
