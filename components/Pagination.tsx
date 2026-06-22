import Link from "next/link";

import { PAGE_SIZE } from "@/lib/constants";
import { Filters, makeHref } from "@/lib/filters";

type PaginationProps = {
  filters: Filters;
  total: number;
  visible: number;
};

export function Pagination({ filters, total, visible }: PaginationProps) {
  if (!total) return null;

  const hasMore = visible < total;
  const prevHref = makeHref(filters.year, filters, { page: Math.max(1, filters.page - 1) });
  const nextHref = makeHref(filters.year, filters, { page: filters.page + 1 });

  return (
    <nav className="pager" aria-label="结果分页">
      <span className="pager-count">
        每页 {PAGE_SIZE} 条，当前显示 {visible}/{total}
      </span>
      <div className="pager-actions">
        {filters.page > 1 ? (
          <Link className="btn btn-reset" href={prevHref}>
            收起一页
          </Link>
        ) : null}
        {hasMore ? (
          <Link className="btn btn-search" href={nextHref}>
            加载更多
          </Link>
        ) : (
          <span className="loading-more">已显示全部结果</span>
        )}
      </div>
    </nav>
  );
}
