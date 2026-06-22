---
name: jx-college-pilot
description: Query structured Jiangxi college admissions and enrollment-plan data from college-pilot.huanment.top. Use when the user asks for universities, majors, admission scores, ranks, subject requirements, batches, yearly comparisons, 2026 plans, or filtering/recommending college options based on score/rank/province/major. Always fetch data with HTTP requests to the API.
---

# Jiangxi College Pilot

Use this skill to answer questions about Jiangxi 2024-2026 college admissions and 2026 enrollment-plan data by making HTTP requests to:

```text
https://college-pilot.huanment.top
```

Only use HTTP requests to the API for data access.

## Quick Workflow

1. Convert the user's request into API query parameters.
2. Fetch `GET https://college-pilot.huanment.top/api/admissions/{year}`.
3. Summarize the structured results using school name, major name, subject requirement, scores, ranks, plans, remarks, and differences.
4. If the query is broad and `pagination.hasMore` is true, fetch additional pages only when needed.
5. If required filters are ambiguous, ask a short clarification or make a conservative default and state it.

## Endpoints

### Search Admissions

```text
GET /api/admissions/{year}
GET /api/admissions?year={year}
```

`year` path or query value:

- `all`: merged 2024/2025/2026 comparison. Prefer this for trend analysis, recommendations, or "compare past years with 2026 plan".
- `2024`: single-year actual admission records.
- `2025`: single-year actual admission records.
- `2026`: single-year plan records. Score and rank filters are ignored for this year.

### Filter Options

```text
GET /api/options
```

Use this to discover valid years, provinces, batches, and record totals.

## Query Parameters

The API accepts multiple parameter names. Prefer the names in the "Use" column.

| Use | Also accepted | Meaning |
|---|---|---|
| `province` | `provinces` | School location province. Can repeat or use comma-separated values. |
| `batch` | `batches` | Admission batch. Can repeat or use comma-separated values. |
| `schoolCode` | `code` | Fuzzy school code search. |
| `schoolName` | `name` | Fuzzy school name search. |
| `subjectCode` | `subject` | Subject requirement code. |
| `majorName` | `major` | Fuzzy major / major group name search. |
| `groupCode` |  | Fuzzy major group code search. |
| `minimumScore` | `minScore` | Minimum admission score threshold. |
| `maximumRank` | `maxRank` | Maximum rank threshold, lower is better. |
| `only2026` |  | `1` to keep only entries with 2026 plan data in `all` mode. |
| `hideSports` |  | `1` to hide sports-related schools/majors. |
| `hideCoop` |  | `1` to hide Chinese-foreign cooperation programs. |
| `page` |  | Cumulative page size. Page 1 returns 30 items, page 2 returns the first 60 items. |

Subject requirement codes:

| Code | Meaning |
|---|---|
| empty |不限 |
| `04` | 物理 |
| `04*05` | 物理+化学 |
| `04*06` | 物理+生物 |
| `04*05*06` | 物理+化学+生物 |

## Parameter Completion

When the user gives partial natural language, fill parameters as follows:

- "多少分能上", "按分数", "最低分不低于": use `minimumScore`.
- "排名", "位次", "排位", "不超过": use `maximumRank`.
- "物化": use `subjectCode=04*05`.
- "物生": use `subjectCode=04*06`.
- "物化生": use `subjectCode=04*05*06`.
- "不限选科": omit `subjectCode`.
- "本科", "提前本科", "专科", "高职": map to `batch` when the intended batch is clear.
- "中外合作不要", "不看合作办学": use `hideCoop=1`.
- "不要体育": use `hideSports=1`.
- "只看2026计划", "今年招生": use `year=2026` for single-year plan lists, or `year=all&only2026=1` when comparisons are useful.
- If the user gives a school name like "南昌大学", use `schoolName=南昌大学`.
- If the user gives a province/city area that is one of the supported provinces, use `province`.

Default behavior:

- Use `year=all` unless the user explicitly asks for a single year.
- Use `page=1` first.
- Do not default `province=江西`; `province` means school location, not candidate origin.
- If score/rank recommendations are requested without a subject requirement, ask for selected subjects when precision matters; otherwise run the broad query and mention that subject filtering was not applied.

## Response Shape

Search responses contain:

```json
{
  "route": { "year": "all", "mode": "mergedComparison" },
  "filters": {},
  "pagination": {
    "page": 1,
    "pageSize": 30,
    "returnedCount": 30,
    "totalCount": 168,
    "hasMore": true
  },
  "error": null,
  "items": []
}
```

Merged `all` items use:

```json
{
  "resultType": "mergedAdmission",
  "province": "江西",
  "school": { "code": "8101", "name": "南昌大学" },
  "subjectRequirement": { "code": "04*05", "label": "物理 化学" },
  "major": { "name": "计算机科学与技术", "groupCode": "504" },
  "currentPlan": {
    "batch": "本科",
    "planType": "非定向",
    "fee": "5550",
    "remark": "不招单色不能识别的考生。"
  },
  "yearlyAdmissions": {
    "2024": { "minimumScore": 603, "minimumRank": 9984, "admittedCount": 73 },
    "2025": { "minimumScore": 599, "minimumRank": 9195, "admittedCount": 76 },
    "2026": { "plannedCount": 51 }
  },
  "yearlyVariants": {},
  "differences": []
}
```

Single-year items use:

```json
{
  "resultType": "singleYearAdmission",
  "year": "2025",
  "province": "江西",
  "school": { "code": "8101", "name": "南昌大学" },
  "subjectRequirement": { "code": "04", "label": "物理" },
  "major": { "name": "法学", "groupCode": "030101" },
  "plan": {
    "batch": "本科",
    "planType": "非定向",
    "fee": "4950",
    "remark": ""
  },
  "admission": {
    "minimumScore": 583,
    "minimumRank": 15243,
    "admittedCount": 6
  }
}
```

For 2026 single-year items, `admission` contains `plannedCount` instead of score/rank.

## Request Examples

Use standard HTTP tooling available in the environment, such as `fetch`, `Invoke-RestMethod`, `curl`, or a web request tool.

Search Nanchang University in merged mode:

```text
https://college-pilot.huanment.top/api/admissions/all?schoolName=南昌大学&page=1
```

Search Jiangxi undergraduate programs for 590+ score and rank <= 15000, excluding cooperation programs:

```text
https://college-pilot.huanment.top/api/admissions/all?province=江西&batch=本科&minimumScore=590&maximumRank=15000&hideCoop=1&page=1
```

Search 2025 physics+chemistry computer-related majors:

```text
https://college-pilot.huanment.top/api/admissions/2025?subjectCode=04*05&majorName=计算机&page=1
```

Search 2026 plan records:

```text
https://college-pilot.huanment.top/api/admissions/2026?schoolName=南昌大学&page=1
```

## Answering Guidance

- Present concise tables for comparisons: school, major, subject requirement, 2024 score/rank, 2025 score/rank, 2026 planned count, batch, fee, remarks.
- For recommendations, separate "safer", "match", and "stretch" only when score/rank evidence supports that grouping.
- Explain that 2026 records are plan data, not actual admission outcomes.
- Preserve important remarks such as color blindness restrictions, language requirements, gender restrictions, military/police categories, or high fees.
- If multiple pages are needed, report how many results exist and whether more pages were fetched.
- Do not invent or expose non-API implementation details.
