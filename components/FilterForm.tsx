import Link from "next/link";

import { AutoSubmitOnChange } from "@/components/AutoSubmitOnChange";
import { PROVINCES_ALL, SUBJECT_OPTIONS } from "@/lib/constants";
import { Filters } from "@/lib/filters";

type FilterFormProps = {
  filters: Filters;
  batches: string[];
};

export function FilterForm({ filters, batches }: FilterFormProps) {
  const scoreDisabled = filters.year === "2026";
  const provinceLabel = getProvinceLabel(filters.provinces);

  return (
    <form className="filter-bar" action={`/${filters.year}`} method="get">
      <div className="filter-row tabs-row">
        <div>
          <span className="label">当前年份</span>
          <strong className="route-pill">{filters.year === "all" ? "全部对比" : `${filters.year} 年`}</strong>
        </div>
        <a className="help-btn" href="https://github.com/HM-Suiji/college-pilot/issues/new">
          反馈
        </a>
      </div>

      <AutoSubmitOnChange>
        <div className="filter-row">
          <label className="filter-item half">
            <span className="label">院校代号</span>
            <input className="input" name="code" placeholder="模糊搜索" defaultValue={filters.code} />
          </label>
          <label className="filter-item half">
            <span className="label">院校名称</span>
            <input className="input" name="name" placeholder="模糊搜索" defaultValue={filters.name} />
          </label>
        </div>

        <div className="filter-row">
          <label className="filter-item half">
            <span className="label">选科要求</span>
            <select className="input native-select" name="subject" defaultValue={filters.subject}>
              {SUBJECT_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-item half">
            <span className="label">专业组代码</span>
            <input
              className="input"
              name="groupCode"
              placeholder="如 501, 5A"
              defaultValue={filters.groupCode}
            />
          </label>
        </div>

        <div className="filter-row">
          <label className="filter-item">
            <span className="label">专业名称</span>
            <input className="input" name="major" placeholder="模糊搜索" defaultValue={filters.major} />
          </label>
        </div>

        {!scoreDisabled ? (
          <div className="filter-row">
            <label className="filter-item half">
              <span className="label">最低分 ≥</span>
              <input
                className="input input-sm"
                name="minScore"
                type="number"
                min="0"
                placeholder="不限"
                defaultValue={filters.minScore || ""}
              />
            </label>
            <label className="filter-item half">
              <span className="label">最低排名 ≤</span>
              <input
                className="input input-sm"
                name="maxRank"
                type="number"
                min="0"
                placeholder="不限"
                defaultValue={filters.maxRank || ""}
              />
            </label>
          </div>
        ) : null}

        <fieldset className="filter-section province-select-section">
          <legend className="label">报考省份（报考学校所在地）</legend>
          <details className="select-dropdown">
            <summary className={filters.provinces.length ? "dropdown-trigger" : "dropdown-trigger placeholder-text"}>
              <span>{provinceLabel}</span>
            </summary>
            <div className="dropdown-panel">
              <div className="check-grid province-grid">
                {PROVINCES_ALL.map((province) => (
                  <label key={province} className="check-filter">
                    <input
                      type="checkbox"
                      name="province"
                      value={province}
                      defaultChecked={filters.provinces.includes(province)}
                    />
                    <span>{province}</span>
                  </label>
                ))}
              </div>
            </div>
          </details>
        </fieldset>

        <fieldset className="filter-section">
          <legend className="label">批次类型</legend>
          <div className="check-grid">
            {batches.map((batch) => (
              <label key={batch} className="check-filter wide">
                <input
                  type="checkbox"
                  name="batch"
                  value={batch}
                  defaultChecked={filters.batches.includes(batch)}
                />
                <span>{batch}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="filter-row toggle-row">
          <label className="toggle-filter">
            <input type="checkbox" name="only2026" value="1" defaultChecked={filters.only2026} />
            <span>仅2026招生</span>
          </label>
          <label className="toggle-filter">
            <input type="checkbox" name="hideSports" value="1" defaultChecked={filters.hideSports} />
            <span>隐藏体育</span>
          </label>
          <label className="toggle-filter">
            <input type="checkbox" name="hideCoop" value="1" defaultChecked={filters.hideCoop} />
            <span>隐藏中外合作</span>
          </label>
        </div>
      </AutoSubmitOnChange>

      <div className="filter-row actions">
        <Link className="btn btn-reset" href="/all">
          重置
        </Link>
        <button className="btn btn-search" type="submit">
          搜索
        </button>
      </div>
    </form>
  );
}

function getProvinceLabel(provinces: string[]) {
  if (!provinces.length) return "全部省份";
  if (provinces.length <= 2) return provinces.join("、");
  return `${provinces.slice(0, 2).join("、")} 等${provinces.length}个省份`;
}
