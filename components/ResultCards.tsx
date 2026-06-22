import { computeDiffs, GroupDiff, MergedRecord, YearMetric } from "@/lib/data";
import { SearchResult } from "@/lib/search";

export function ResultCards({ items }: { items: SearchResult[] }) {
  return (
    <div id="result-cards">
      {items.map((item, index) =>
        item.isGrouped ? (
          <GroupedCard key={`${item.schoolName}-${item.majorName}-${index}`} item={item} />
        ) : (
          <SingleCard key={`${item.year}-${item.schoolCode}-${item.majorName}-${index}`} item={item} />
        ),
      )}
    </div>
  );
}

function GroupedCard({ item }: { item: MergedRecord }) {
  const diffs = computeDiffs(item);
  const isNew = item.y2026 && !item.y2024 && !item.y2025;

  return (
    <article className="card">
      <header className="card-header">
        <span className="card-name">{item.schoolName}</span>
        <span className="card-code">{item.schoolCode}</span>
        {isNew ? <span className="tag-new">新</span> : null}
      </header>
      <div className="card-body">
        <Row label="省份" value={item.province} />
        {item.batch ? <Row label="批次" value={item.batch} className="badge" /> : null}
        <Row label="选科" value={item.subjectText} className="tag" />
        {item.plan ? <Row label="性质" value={item.plan} /> : null}
        {item.majorName ? <Row label="专业名称" value={item.majorName} className="full" /> : null}
        {item.groupCode ? <Row label="专业组" value={item.groupCode} /> : null}
        <YearRow year="2024" metric={item.y2024} />
        <YearRow year="2025" metric={item.y2025} />
        {item.y2026 ? <PlanRow metric={item.y2026} /> : null}
        {item.fee ? <Row label="收费标准" value={`${item.fee}元/年`} /> : null}
        {item.remark ? <Remark text={item.remark} /> : null}
        <Diffs diffs={diffs} />
      </div>
    </article>
  );
}

function SingleCard({ item }: { item: Extract<SearchResult, { isGrouped: false }> }) {
  return (
    <article className="card">
      <header className="card-header">
        <span className="card-year">{item.year}</span>
        <span className="card-name">{item.schoolName}</span>
        <span className="card-code">{item.schoolCode}</span>
      </header>
      <div className="card-body">
        <Row label="省份" value={item.province} />
        {item.batch ? <Row label="批次" value={item.batch} className="badge" /> : null}
        <Row label="选科" value={item.subjectText} className="tag" />
        {item.plan ? <Row label="性质" value={item.plan} /> : null}
        {item.majorName ? <Row label="专业名称" value={item.majorName} className="full" /> : null}
        {item.groupCode ? <Row label="专业组" value={item.groupCode} /> : null}
        {item.year !== "2026" ? (
          <>
            <Row label="最低分" value={String(item.score)} className="highlight" />
            <Row label="最低排名" value={String(item.rank)} className="highlight" />
            <Row label="录取" value={`${item.count}人`} />
          </>
        ) : (
          <Row label="计划录取" value={`${item.count}人`} className="highlight" />
        )}
        {item.fee ? <Row label="收费标准" value={`${item.fee}元/年`} /> : null}
        {item.remark ? <Remark text={item.remark} /> : null}
      </div>
    </article>
  );
}

function Row({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className="card-row">
      <span className="card-label">{label}</span>
      <span className={`card-value ${className}`.trim()}>{value}</span>
    </div>
  );
}

function YearRow({ year, metric }: { year: string; metric: YearMetric | null }) {
  if (!metric) return null;

  return (
    <div className="card-row">
      <span className="gp-label">{year}</span>
      <span className="card-value highlight">{metric.score}分</span>
      <span className="card-value highlight">最低排名 {metric.rank}</span>
      <span className="card-value">录取{metric.count}人</span>
    </div>
  );
}

function PlanRow({ metric }: { metric: YearMetric }) {
  return (
    <div className="card-row gp-year">
      <span className="gp-label">2026</span>
      <span className="card-value">计划录取{metric.count}人</span>
    </div>
  );
}

function Remark({ text }: { text: string }) {
  return (
    <details className="remark-details">
      <summary className="card-row card-remark-header">
        <span className="card-label">备注</span>
        <span className="card-remark-toggle">展开/收起</span>
      </summary>
      <div className="card-row card-remark-body">
        <span className="card-value full">{text}</span>
      </div>
    </details>
  );
}

function Diffs({ diffs }: { diffs: GroupDiff[] }) {
  if (!diffs.length) return null;

  return (
    <section className="diff-section" aria-label="年份差异对比">
      {diffs.map((diff) => (
        <div className="diff-group" key={diff.field}>
          <span className="diff-field">{diff.field === "专业组" ? "专业组变动" : `${diff.field}差异`}</span>
          {diff.entries.map((entry) => (
            <div className="diff-entry" key={`${diff.field}-${entry.years}-${entry.value}`}>
              <span className="diff-years">{entry.years}</span>
              <span className="diff-arrow">→</span>
              <span className="diff-val">{entry.value}</span>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
