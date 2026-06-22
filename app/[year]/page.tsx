import { notFound } from "next/navigation";
import { Suspense } from "react";

import { FilterForm } from "@/components/FilterForm";
import { Pagination } from "@/components/Pagination";
import { ResultCards } from "@/components/ResultCards";
import { YearTabs } from "@/components/YearTabs";
import { getAdmissionData } from "@/lib/data";
import { normalizeYear, parseFilters, SearchParamsInput, visibleLimit } from "@/lib/filters";
import { searchAdmissions } from "@/lib/search";

type PageProps = {
  params: Promise<{ year: string }>;
  searchParams: Promise<SearchParamsInput>;
};

export default function AdmissionsPage(props: PageProps) {
  return (
    <Suspense fallback={<main className="page" aria-label="正在加载查询结果" />}>
      <AdmissionsRuntimePage {...props} />
    </Suspense>
  );
}

async function AdmissionsRuntimePage({ params, searchParams }: PageProps) {
  const [{ year: yearParam }, rawSearchParams] = await Promise.all([params, searchParams]);
  const year = normalizeYear(yearParam);

  if (!year) notFound();

  const data = getAdmissionData();
  const filters = parseFilters(year, rawSearchParams);
  const output = searchAdmissions(filters);
  const limit = Math.min(visibleLimit(filters.page), output.total);
  const visibleItems = output.items.slice(0, limit);

  return (
    <main className="page">
      <FilterForm filters={filters} batches={data.batches} />

      <section className="right-col" aria-label="查询结果">
        <div className="result-bar">
          <div className="result-bar-left">
            <span>
              共 <strong className="count">{output.total}</strong> 条结果
            </span>
            {visibleItems.length > 0 ? (
              <span className="load-time">已显示 {visibleItems.length} 条</span>
            ) : null}
          </div>
          <div className="result-bar-actions">
            <a className="help-btn" href="https://github.com/Shirakawa-Kotone/miniprogram-web/issues/new">
              反馈
            </a>
          </div>
        </div>

        <div className="result-list">
          <YearTabs filters={filters} />
          {filters.error ? <div className="empty">{filters.error}</div> : null}
          {!filters.error && output.total === 0 ? <div className="empty">无匹配结果</div> : null}
          <ResultCards items={visibleItems} />
          <Pagination filters={filters} total={output.total} visible={visibleItems.length} />
        </div>
      </section>
    </main>
  );
}
