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
  majorCode: string;
  plan: string;
  fee: string;
  remark: string;
  count: number;
  score: number | null;
  rank: number | null;
  matchedYear: AdmissionYear | null;
  matchedMajorName: string;
};

export type SchoolGroupOption = {
  value: string;
  label: string;
  groupCount: number;
  majorCount: number;
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
  const historicalRecords = data.records.filter((record) => matchesHistoricalScope(record, filters));
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
    .map((recordsInGroup) => toGroupDetail(recordsInGroup, filters.sort, historicalRecords))
    .sort((a, b) => sortGroups(a, b, filters.sort));
}

export function getSchoolGroupOptions(filters: SchoolGroupFilters): SchoolGroupOption[] {
  const data = getAdmissionData();
  const optionGroups = new Map<string, AdmissionRecord[]>();

  for (const record of data.records) {
    if (!matchesFilters(record, { ...filters, groupCode: "" })) continue;
    if (!record.groupCode) continue;
    optionGroups.set(record.groupCode, [...(optionGroups.get(record.groupCode) ?? []), record]);
  }

  return Array.from(optionGroups.entries()).map(toGroupOption).sort((a, b) =>
    a.value.localeCompare(b.value, "zh-Hans-CN", { numeric: true })
      || a.label.localeCompare(b.label, "zh-Hans-CN", { numeric: true }),
  );
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

function toGroupOption([groupCode, records]: [string, AdmissionRecord[]]): SchoolGroupOption {
  const years = Array.from(new Set(records.map((record) => record.year))).sort((a, b) => yearWeight(a) - yearWeight(b));
  const subjects = Array.from(new Set(records.map((record) => record.subjectText).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "zh-Hans-CN"),
  );
  const batches = Array.from(new Set(records.map((record) => record.batch).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "zh-Hans-CN"),
  );
  const distinctGroups = new Set(
    records.map((record) => [record.year, record.schoolCode, record.subjectCode, record.batch, record.groupCode].join("\u0000")),
  );
  const distinctMajors = new Set(records.map((record) => [record.year, record.majorName].join("\u0000")));
  const details = [years.join("/"), subjects.join("、"), batches.join("、")]
    .filter(Boolean)
    .join(" · ");

  return {
    value: groupCode,
    label: `${groupCode}${details ? `（${details}）` : ""} - ${distinctMajors.size}个专业`,
    groupCount: distinctGroups.size,
    majorCount: distinctMajors.size,
  };
}

function matchesHistoricalScope(record: AdmissionRecord, filters: SchoolGroupFilters): boolean {
  if (record.year === "2026" || record.score <= 0 || record.rank <= 0) return false;
  if (filters.code && !record.schoolCode.includes(filters.code)) return false;
  if (filters.name && !record.schoolName.includes(filters.name)) return false;
  if (filters.province && record.province !== filters.province) return false;
  if (filters.subject && record.subjectCode !== filters.subject) return false;
  if (filters.batch && record.batch !== filters.batch) return false;
  return true;
}

function toGroupDetail(
  records: AdmissionRecord[],
  sort: SchoolGroupSort,
  historicalRecords: AdmissionRecord[],
): SchoolGroupDetail {
  const [first] = records;
  const majors = records
    .map((record) => toMajorDetail(record, historicalRecords))
    .sort((a, b) => sortMajors(a, b, sort));
  const floorRecord = records
    .filter((record) => record.year !== "2026" && record.score > 0 && record.rank > 0)
    .sort((a, b) => a.score - b.score || b.rank - a.rank)[0];
  const matchedFloor = majors
    .filter((major) => major.score !== null && major.rank !== null)
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0) || (b.rank ?? 0) - (a.rank ?? 0))[0];

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
    minimumScore: floorRecord?.score ?? matchedFloor?.score ?? null,
    minimumRank: floorRecord?.rank ?? matchedFloor?.rank ?? null,
    majors,
  };
}

function toMajorDetail(record: AdmissionRecord, historicalRecords: AdmissionRecord[]): SchoolMajorDetail {
  const matchedRecord = record.year === "2026" ? findHistoricalMatch(record, historicalRecords) : null;

  return {
    majorName: record.majorName,
    majorCode: record.majorCode,
    plan: record.plan,
    fee: record.fee,
    remark: record.remark,
    count: record.count,
    score: record.year === "2026" ? matchedRecord?.score ?? null : record.score,
    rank: record.year === "2026" ? matchedRecord?.rank ?? null : record.rank,
    matchedYear: matchedRecord?.year ?? null,
    matchedMajorName: matchedRecord?.majorName ?? "",
  };
}

function findHistoricalMatch(target: AdmissionRecord, historicalRecords: AdmissionRecord[]): AdmissionRecord | null {
  const scored = historicalRecords.flatMap((candidate) => {
    if (!sameSchool(target, candidate)) return [];
    if (target.province && candidate.province !== target.province) return [];
    if (target.subjectCode && candidate.subjectCode !== target.subjectCode) return [];
    if (target.batch && candidate.batch !== target.batch) return [];

    const codeScore = target.majorCode && candidate.majorCode && target.majorCode === candidate.majorCode ? 110 : 0;
    const nameScore = scoreMajorName(target.majorName, candidate.majorName);
    const score = Math.max(codeScore, nameScore);

    if (score < 78) return [];
    return [{ candidate, score }];
  });

  scored.sort((a, b) =>
    b.score - a.score
    || historicalYearWeight(b.candidate.year) - historicalYearWeight(a.candidate.year)
    || b.candidate.rank - a.candidate.rank,
  );

  return scored[0]?.candidate ?? null;
}

function sameSchool(a: AdmissionRecord, b: AdmissionRecord): boolean {
  if (a.schoolCode && b.schoolCode && a.schoolCode === b.schoolCode) return true;
  return Boolean(a.schoolName && a.schoolName === b.schoolName);
}

function scoreMajorName(a: string, b: string): number {
  const normalizedA = normalizeMajorName(a);
  const normalizedB = normalizeMajorName(b);
  if (!normalizedA || !normalizedB) return 0;
  if (normalizedA === normalizedB) return 100;

  const partsA = splitMajorParts(a).map(normalizeMajorName).filter(Boolean);
  const partsB = splitMajorParts(b).map(normalizeMajorName).filter(Boolean);
  if (partsA.some((part) => part === normalizedB) || partsB.some((part) => part === normalizedA)) return 96;

  const shortest = Math.min(normalizedA.length, normalizedB.length);
  if (shortest >= 4 && (normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA))) return 92;
  if (shortest < 4) return 0;

  const dice = diceCoefficient(normalizedA, normalizedB);
  return dice >= 0.72 ? Math.round(80 + dice * 15) : 0;
}

function normalizeMajorName(valueToNormalize: string): string {
  return valueToNormalize
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s,，、;；:：.。·\-_/\\()[\]（）【】{}《》<>]/g, "")
    .replace(/专业$/g, "");
}

function splitMajorParts(valueToSplit: string): string[] {
  return valueToSplit
    .normalize("NFKC")
    .split(/[\s,，、;；/()[\]（）【】{}《》<>]+/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function diceCoefficient(a: string, b: string): number {
  const bigramsA = toBigrams(a);
  const bigramsB = toBigrams(b);
  if (!bigramsA.length || !bigramsB.length) return 0;

  const counts = new Map<string, number>();
  for (const bigram of bigramsA) counts.set(bigram, (counts.get(bigram) ?? 0) + 1);

  let overlap = 0;
  for (const bigram of bigramsB) {
    const count = counts.get(bigram) ?? 0;
    if (!count) continue;
    overlap += 1;
    counts.set(bigram, count - 1);
  }

  return (2 * overlap) / (bigramsA.length + bigramsB.length);
}

function toBigrams(valueToSplit: string): string[] {
  if (valueToSplit.length < 2) return [];
  return Array.from({ length: valueToSplit.length - 1 }, (_, index) => valueToSplit.slice(index, index + 2));
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

function historicalYearWeight(year: AdmissionYear): number {
  if (year === "2025") return 2;
  if (year === "2024") return 1;
  return 0;
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
