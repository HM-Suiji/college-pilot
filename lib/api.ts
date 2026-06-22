import { AdmissionYear, PAGE_SIZE, RouteYear } from "./constants";
import { AdmissionRecord, computeDiffs, getAdmissionData, MergedRecord, YearMetric } from "./data";
import { Filters, parseFilters, SearchParamsInput, visibleLimit } from "./filters";
import { SearchResult, searchAdmissions } from "./search";

export type ApiSearchParams = URLSearchParams | SearchParamsInput;

export function buildAdmissionsApiResponse(year: RouteYear, searchParams: ApiSearchParams) {
  const filters = parseFilters(year, normalizeSearchParams(searchParams));
  const output = searchAdmissions(filters);
  const limit = Math.min(visibleLimit(filters.page), output.total);
  const items = output.items.slice(0, limit).map(serializeSearchResult);

  return {
    route: {
      year,
      mode: year === "all" ? "mergedComparison" : "singleYear",
    },
    filters: serializeFilters(filters),
    pagination: {
      page: filters.page,
      pageSize: PAGE_SIZE,
      returnedCount: items.length,
      totalCount: output.total,
      hasMore: limit < output.total,
    },
    error: filters.error || null,
    items,
  };
}

export function buildOptionsApiResponse() {
  const data = getAdmissionData();

  return {
    years: ["all", "2024", "2025", "2026"],
    provinces: [
      ...new Set(data.records.map((record) => record.province).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b, "zh-Hans-CN")),
    batches: data.batches,
    totals: {
      allRecords: data.records.length,
      mergedRecords: data.merged.length,
      byYear: {
        "2024": data.byYear["2024"].length,
        "2025": data.byYear["2025"].length,
        "2026": data.byYear["2026"].length,
      },
    },
  };
}

function serializeSearchResult(item: SearchResult) {
  if (item.isGrouped) {
    return serializeMergedRecord(item);
  }

  return serializeAdmissionRecord(item);
}

function serializeMergedRecord(record: MergedRecord & { isGrouped?: boolean }) {
  return {
    resultType: "mergedAdmission",
    province: record.province,
    school: {
      code: record.schoolCode,
      name: record.schoolName,
    },
    subjectRequirement: {
      code: record.subjectCode,
      label: record.subjectText,
    },
    major: {
      name: record.majorName,
      groupCode: record.groupCode,
    },
    currentPlan: {
      batch: record.batch,
      planType: record.plan,
      fee: record.fee,
      remark: record.remark,
    },
    yearlyAdmissions: {
      "2024": serializeHistoricalMetric(record.y2024),
      "2025": serializeHistoricalMetric(record.y2025),
      "2026": serializePlanMetric(record.y2026),
    },
    yearlyVariants: serializeVariants(record),
    differences: computeDiffs(record),
  };
}

function serializeAdmissionRecord(record: AdmissionRecord & { isGrouped?: boolean }) {
  return {
    resultType: "singleYearAdmission",
    year: record.year,
    province: record.province,
    school: {
      code: record.schoolCode,
      name: record.schoolName,
    },
    subjectRequirement: {
      code: record.subjectCode,
      label: record.subjectText,
    },
    major: {
      name: record.majorName,
      groupCode: record.groupCode,
    },
    plan: {
      batch: record.batch,
      planType: record.plan,
      fee: record.fee,
      remark: record.remark,
    },
    admission:
      record.year === "2026"
        ? {
            plannedCount: record.count,
          }
        : {
            minimumScore: record.score,
            minimumRank: record.rank,
            admittedCount: record.count,
          },
  };
}

function serializeHistoricalMetric(metric: YearMetric | null) {
  if (!metric) return null;

  return {
    minimumScore: metric.score,
    minimumRank: metric.rank,
    admittedCount: metric.count,
  };
}

function serializePlanMetric(metric: YearMetric | null) {
  if (!metric) return null;

  return {
    plannedCount: metric.count,
  };
}

function serializeVariants(record: MergedRecord) {
  return (["2024", "2025", "2026"] as AdmissionYear[]).reduce(
    (out, year) => {
      const variant = record.variants[year];
      out[year] = variant
        ? {
            batch: variant.batch,
            planType: variant.plan,
            groupCode: variant.groupCode,
            fee: variant.fee,
          }
        : null;
      return out;
    },
    {} as Record<AdmissionYear, { batch: string; planType: string; groupCode: string; fee: string } | null>,
  );
}

function serializeFilters(filters: Filters) {
  return {
    year: filters.year,
    provinces: filters.provinces,
    batches: filters.batches,
    schoolCode: filters.code,
    schoolName: filters.name,
    subjectCode: filters.subject,
    majorName: filters.major,
    groupCode: filters.groupCode,
    minimumScore: filters.minScore || null,
    maximumRank: filters.maxRank || null,
    only2026Admissions: filters.only2026,
    hideSportsMajors: filters.hideSports,
    hideCooperationPrograms: filters.hideCoop,
  };
}

export function normalizeSearchParams(searchParams: ApiSearchParams): SearchParamsInput {
  const input = searchParams instanceof URLSearchParams ? fromUrlSearchParams(searchParams) : searchParams;

  return {
    ...input,
    province: coalesce(input.province, input.provinces),
    batch: coalesce(input.batch, input.batches),
    code: coalesce(input.code, input.schoolCode),
    name: coalesce(input.name, input.schoolName),
    subject: coalesce(input.subject, input.subjectCode),
    major: coalesce(input.major, input.majorName),
    minScore: coalesce(input.minScore, input.minimumScore),
    maxRank: coalesce(input.maxRank, input.maximumRank),
  };
}

function fromUrlSearchParams(searchParams: URLSearchParams): SearchParamsInput {
  const out: SearchParamsInput = {};

  for (const key of searchParams.keys()) {
    const values = searchParams.getAll(key);
    out[key] = values.length > 1 ? values : values[0];
  }

  return out;
}

function coalesce(
  primary: string | string[] | undefined,
  fallback: string | string[] | undefined,
) {
  return primary ?? fallback;
}
