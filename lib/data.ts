import "server-only";

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { cacheLife, cacheTag } from "next/cache";

import { AdmissionYear, SR_RMAP, subjectLabel } from "./constants";

type RawRecord = [
  number,
  number,
  string | number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number | null,
];

type RawData = {
  a: string[];
  b: string[];
  c: string[];
  d: RawRecord[];
  e: {
    b?: string[];
    p?: string[];
    g?: string[];
    f?: string[];
    r?: string[];
  };
};

export type YearMetric = {
  score: number;
  rank: number;
  count: number;
};

export type AdmissionRecord = {
  year: AdmissionYear;
  province: string;
  schoolCode: string;
  schoolName: string;
  subjectCode: string;
  subjectText: string;
  majorName: string;
  majorCode: string;
  score: number;
  rank: number;
  count: number;
  batch: string;
  plan: string;
  groupCode: string;
  fee: string;
  remark: string;
};

export type GroupDiff = {
  field: string;
  entries: Array<{ years: string; value: string }>;
};

export type MergedRecord = {
  province: string;
  schoolCode: string;
  schoolName: string;
  subjectCode: string;
  subjectText: string;
  majorName: string;
  y2024: YearMetric | null;
  y2025: YearMetric | null;
  y2026: YearMetric | null;
  batch: string;
  plan: string;
  groupCode: string;
  fee: string;
  remark: string;
  variants: Record<AdmissionYear, Pick<AdmissionRecord, "batch" | "plan" | "groupCode" | "fee">>;
};

export type AdmissionData = {
  records: AdmissionRecord[];
  byYear: Record<AdmissionYear, AdmissionRecord[]>;
  merged: MergedRecord[];
  batches: string[];
};

let cache: AdmissionData | null = null;

function loadRawData(): RawData {
  const filePath = path.join(process.cwd(), "alldata.js");
  const source = fs.readFileSync(filePath, "utf8");
  const sandbox: { window: { ALL_DATA_RAW?: RawData }; ALL_DATA_RAW?: RawData } = {
    window: {},
  };

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: "alldata.js" });

  const raw = sandbox.window.ALL_DATA_RAW ?? sandbox.ALL_DATA_RAW;
  if (!raw || !Array.isArray(raw.d)) {
    throw new Error("alldata.js did not expose window.ALL_DATA_RAW");
  }

  return raw;
}

function expandRawData(raw: RawData): AdmissionRecord[] {
  const provincePool = raw.a ?? [];
  const schoolNamePool = raw.b ?? [];
  const majorNamePool = raw.c ?? [];
  const records = raw.d ?? [];
  const extra = raw.e ?? {};
  const batchPool = extra.b ?? [];
  const planPool = extra.p ?? [];
  const groupCodePool = extra.g ?? [];
  const feePool = extra.f ?? [];
  const remarkPool = extra.r ?? [];
  const yearMap = ["2024", "2025", "2026"] as const;

  return records.map((record) => {
    const subjectCode = SR_RMAP[record[4]] ?? "";
    const year = yearMap[record[0]] ?? "2024";

    return {
      year,
      province: provincePool[record[1]] ?? "",
      schoolCode: String(record[2] ?? ""),
      schoolName: schoolNamePool[record[3]] ?? "",
      subjectCode,
      subjectText: subjectLabel(subjectCode),
      majorName: majorNamePool[record[5]] ?? "",
      majorCode: record[14] === null ? "" : groupCodePool[record[14]] ?? "",
      score: Number(record[6] ?? 0),
      rank: Number(record[7] ?? 0),
      count: Number(record[8] ?? 0),
      batch: batchPool[record[9]] ?? "",
      plan: planPool[record[10]] ?? "",
      groupCode: groupCodePool[record[11]] ?? "",
      fee: feePool[record[12]] ?? "",
      remark: remarkPool[record[13]] ?? "",
    };
  });
}

function buildMerged(records: AdmissionRecord[]): MergedRecord[] {
  const groups = new Map<string, MergedRecord>();

  for (const record of records) {
    const key = `${record.schoolName}\u0000${record.majorName}`;
    let group = groups.get(key);

    if (!group) {
      group = {
        province: record.province,
        schoolCode: record.schoolCode,
        schoolName: record.schoolName,
        subjectCode: record.subjectCode,
        subjectText: record.subjectText,
        majorName: record.majorName,
        y2024: null,
        y2025: null,
        y2026: null,
        batch: record.batch,
        plan: record.plan,
        groupCode: record.groupCode,
        fee: record.fee,
        remark: record.remark,
        variants: {} as MergedRecord["variants"],
      };
      groups.set(key, group);
    }

    group.variants[record.year] = {
      batch: record.batch,
      plan: record.plan,
      groupCode: record.groupCode,
      fee: record.fee,
    };

    if (record.year === "2024" && !group.y2024) {
      group.y2024 = toMetric(record);
    } else if (record.year === "2025" && !group.y2025) {
      group.y2025 = toMetric(record);
    } else if (record.year === "2026") {
      group.y2026 ??= toMetric(record);
      group.schoolCode = record.schoolCode;
      group.batch = record.batch;
      group.plan = record.plan;
      group.groupCode = record.groupCode;
      group.fee = record.fee;
      group.remark = record.remark;
    }
  }

  return Array.from(groups.values());
}

function toMetric(record: AdmissionRecord): YearMetric {
  return {
    score: record.score,
    rank: record.rank,
    count: record.count,
  };
}

export function getAdmissionData(): AdmissionData {
  if (cache) return cache;

  const records = expandRawData(loadRawData());
  const byYear = {
    "2024": records.filter((record) => record.year === "2024"),
    "2025": records.filter((record) => record.year === "2025"),
    "2026": records.filter((record) => record.year === "2026"),
  };
  const batches = Array.from(
    new Set(records.map((record) => record.batch).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));

  cache = {
    records,
    byYear,
    merged: buildMerged(records),
    batches,
  };

  return cache;
}

export async function getCachedAdmissionData(): Promise<AdmissionData> {
  "use cache";

  cacheLife({
    stale: 60 * 60 * 24 * 365,
    revalidate: 60 * 60 * 24 * 365,
    expire: 60 * 60 * 24 * 365 * 2,
  });
  cacheTag("admissions", "admissions:data");

  return getAdmissionData();
}

export function computeDiffs(record: MergedRecord): GroupDiff[] {
  const years: AdmissionYear[] = [];
  if (record.y2024) years.push("2024");
  if (record.y2025) years.push("2025");
  if (record.y2026) years.push("2026");
  if (years.length < 2) return [];

  const fields = [
    { key: "groupCode", label: "专业组" },
    { key: "batch", label: "批次" },
    { key: "plan", label: "性质" },
    { key: "fee", label: "收费标准" },
  ] as const;

  return fields.flatMap((field) => {
    const values = new Map<string, AdmissionYear[]>();

    for (const year of years) {
      const variant = record.variants[year];
      if (!variant) continue;
      const value = String(variant[field.key] ?? "");
      if (!value) continue;
      values.set(value, [...(values.get(value) ?? []), year]);
    }

    if (values.size <= 1) return [];

    return {
      field: field.label,
      entries: Array.from(values.entries()).map(([value, groupedYears]) => ({
        years: `${groupedYears.join("、")}年`,
        value,
      })),
    };
  });
}
