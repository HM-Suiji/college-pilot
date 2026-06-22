export const YEARS = ["2024", "2025", "2026"] as const;
export type AdmissionYear = (typeof YEARS)[number];
export type RouteYear = AdmissionYear | "all";

export const PAGE_SIZE = 30;

export const SR_RMAP = ["04*05", "04", "04*06", "04*05*06"] as const;
export const SR_MAP: Record<string, string> = {
  "04": "物理",
  "05": "化学",
  "06": "生物",
};

export const SUBJECT_OPTIONS = [
  { label: "不限", value: "" },
  { label: "物理", value: "04" },
  { label: "物理+化学", value: "04*05" },
  { label: "物理+生物", value: "04*06" },
  { label: "物理+化学+生物", value: "04*05*06" },
] as const;

export const PROVINCES_ALL = [
  "安徽",
  "北京",
  "重庆",
  "福建",
  "甘肃",
  "广东",
  "广西",
  "贵州",
  "海南",
  "河北",
  "河南",
  "黑龙江",
  "湖北",
  "湖南",
  "吉林",
  "江苏",
  "江西",
  "辽宁",
  "内蒙古",
  "宁夏",
  "青海",
  "山东",
  "山西",
  "陕西",
  "上海",
  "四川",
  "天津",
  "西藏",
  "香港",
  "新疆",
  "云南",
  "浙江",
] as const;

export function subjectLabel(subjectCode: string): string {
  if (!subjectCode) return "不限";
  return subjectCode
    .split("*")
    .map((code) => SR_MAP[code] ?? code)
    .join(" ");
}
