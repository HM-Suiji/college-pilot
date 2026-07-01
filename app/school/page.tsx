import Link from "next/link";
import { Suspense } from "react";

import {
  getSchoolGroupDetails,
  makeSchoolSearchHref,
  parseSchoolGroupFilters,
  SchoolGroupDetail,
  SchoolGroupFilters,
  SchoolMajorDetail,
} from "@/lib/schoolGroups";

type SchoolPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const YEAR_OPTIONS = [
  { label: "全部", value: "all" },
  { label: "2025", value: "2025" },
  { label: "2024", value: "2024" },
  { label: "2026", value: "2026" },
] as const;

const SORT_OPTIONS = [
  { label: "位次低到高", value: "rankAsc" },
  { label: "位次高到低", value: "rankDesc" },
] as const;

export default function SchoolPage(props: SchoolPageProps) {
  return (
    <Suspense fallback={<main className="school-page" aria-label="正在加载专业组明细" />}>
      <SchoolRuntimePage {...props} />
    </Suspense>
  );
}

async function SchoolRuntimePage({ searchParams }: SchoolPageProps) {
  const rawSearchParams = await searchParams;
  const filters = parseSchoolGroupFilters(rawSearchParams);
  const groups = filters.code || filters.name ? getSchoolGroupDetails(filters) : [];
  const totalMajors = groups.reduce((sum, group) => sum + group.majors.length, 0);

  return (
    <main className="school-page">
      <section className="school-panel" aria-label="院校专业组查询条件">
        <div className="school-panel-header">
          <div>
            <p className="label">院校专业组明细</p>
            <h1 className="school-title">按专业组看最低位次</h1>
          </div>
          <Link className="help-btn" href={backToSearchHref(filters)}>
            返回搜索
          </Link>
        </div>

        <form className="school-search-form" action="/school" method="get">
          <label className="filter-item">
            <span className="label">年份</span>
            <select className="input native-select" name="year" defaultValue={filters.year}>
              {YEAR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-item">
            <span className="label">院校代号</span>
            <input className="input" name="code" placeholder="如 1001" defaultValue={filters.code} />
          </label>
          <label className="filter-item wide">
            <span className="label">院校名称</span>
            <input className="input" name="name" placeholder="输入院校名称" defaultValue={filters.name} />
          </label>
          <label className="filter-item">
            <span className="label">专业组</span>
            <input className="input" name="groupCode" placeholder="全部" defaultValue={filters.groupCode} />
          </label>
          <label className="filter-item">
            <span className="label">排序</span>
            <select className="input native-select" name="sort" defaultValue={filters.sort}>
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-search school-submit" type="submit">
            查看
          </button>
        </form>

        {filters.groupCode ? (
          <Link className="school-clear-link" href={makeSchoolSearchHref(filters, { groupCode: null })}>
            查看该校全部专业组
          </Link>
        ) : null}
      </section>

      <section className="school-results" aria-label="专业组明细列表">
        <div className="school-result-bar">
          <span>
            共 <strong className="count">{groups.length}</strong> 个专业组
          </span>
          {groups.length ? (
            <span>
              包含 {totalMajors} 个专业，{sortLabel(filters.sort)}
            </span>
          ) : null}
        </div>

        {!filters.code && !filters.name ? (
          <div className="empty">请输入院校代号或院校名称</div>
        ) : null}
        {(filters.code || filters.name) && groups.length === 0 ? (
          <div className="empty">没有找到对应专业组</div>
        ) : null}

        <div className="school-group-list">
          {groups.map((group) => (
            <SchoolGroupCard key={group.id} group={group} />
          ))}
        </div>
      </section>
    </main>
  );
}

function SchoolGroupCard({ group }: { group: SchoolGroupDetail }) {
  return (
    <article className="school-group-card">
      <header className="school-group-header">
        <div className="school-group-title">
          <span className="card-year">{group.year}</span>
          <strong>{group.schoolName}</strong>
          <span className="card-code">{group.schoolCode}</span>
        </div>
        <div className="school-group-tags">
          <span className="card-value tag">{group.groupCode}</span>
          <span className="card-value badge">{group.subjectText}</span>
          {group.batch ? <span className="card-value">{group.batch}</span> : null}
        </div>
      </header>

      <div className="school-group-summary" aria-label="专业组最低录取信息">
        <Metric label="组最低位次" value={formatMetric(group.minimumRank, "暂无")} primary />
        <Metric label="对应最低分" value={formatMetric(group.minimumScore, "暂无")} />
        <Metric label={group.year === "2026" ? "计划人数" : "录取人数"} value={`${group.totalCount}人`} />
      </div>

      <div className="major-list" role="list" aria-label="专业录取列表">
        <div className="major-row major-head" role="presentation">
          <span>专业</span>
          <span>{group.year === "2026" ? "计划" : "录取"}</span>
          <span>最低位次</span>
          <span>最低分</span>
        </div>
        {group.majors.map((major, index) => (
          <MajorRow key={`${major.majorName}-${index}`} major={major} />
        ))}
      </div>
    </article>
  );
}

function MajorRow({ major }: { major: SchoolMajorDetail }) {
  return (
    <div className="major-row" role="listitem">
      <div className="major-name">
        <span>{major.majorName}</span>
        {major.plan ? <small>{major.plan}</small> : null}
      </div>
      <span>{major.count}人</span>
      <strong>{formatMetric(major.rank, "-")}</strong>
      <span>{formatMetric(major.score, "-")}</span>
    </div>
  );
}

function Metric({ label, value, primary = false }: { label: string; value: string; primary?: boolean }) {
  return (
    <div className={primary ? "school-metric primary" : "school-metric"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatMetric(valueToFormat: number | null, fallback: string): string {
  return valueToFormat === null ? fallback : valueToFormat.toLocaleString("zh-CN");
}

function backToSearchHref(filters: SchoolGroupFilters): string {
  const params = new URLSearchParams();
  if (filters.code) params.set("code", filters.code);
  if (filters.name) params.set("name", filters.name);
  if (filters.groupCode) params.set("groupCode", filters.groupCode);
  if (filters.subject) params.set("subject", filters.subject);
  if (filters.batch) params.set("batch", filters.batch);

  const year = filters.year || "all";
  const query = params.toString();
  return `/${year}${query ? `?${query}` : ""}`;
}

function sortLabel(sort: SchoolGroupFilters["sort"]): string {
  return sort === "rankDesc" ? "位次高到低" : "位次低到高";
}
