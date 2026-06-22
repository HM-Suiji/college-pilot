---
name: jx-preference-pilot
description: Build Jiangxi college-application preference plans with 冲稳保 strategy for 本科批 and 专科批. Collects user profile, queries jx-college-pilot for admissions data, and produces ranked professional-group plans.
---

# Jiangxi Preference Pilot

Use this skill to guide 江西本科批志愿填报, and to handle 专科批 when the user explicitly asks for it. First clarify the candidate profile and preferences, then query `jx-college-pilot` for admissions and 2026 plan data, and finally produce a professional-group plan using 冲稳保 strategy.

## Required Companion Skill

Use `jx-college-pilot` for all college, major, admission score/rank, and 2026 enrollment-plan queries.

- If `jx-college-pilot` is available as a skill, read and follow it before querying.
- If it is a sibling skill in the workspace, use `skills/jx-college-pilot/SKILL.md` as the reference.
- If `jx-college-pilot` is not installed or cannot be found, stop before querying and tell the user to install `jx-college-pilot` first. Explain that `jx-preference-pilot` depends on it for authoritative admissions and 2026 plan data.
- Do not invent admission records. Fetch data through the College Pilot API described by `jx-college-pilot`.

## Intake

Before making a plan, collect the information below. Ask only for missing details that materially affect recommendations; score/rank and subject combination are essential.

Required:

- Candidate score and rank/位次. Prefer rank for risk judgment.
- Subject combination, such as 物理, 物理+化学, 物理+生物, 物理+化学+生物, or 不限.
- Batch. Default to 本科批 when the user does not specify.
- Major preferences: preferred fields, disliked fields, acceptable related fields, and whether school-first or major-first.
- School location preferences: preferred provinces/cities, must-avoid regions, distance from home, climate/city-size preferences.
- School preferences: public/private, school level, campus environment, tuition budget, Chinese-foreign cooperation acceptance, language/medical/color-vision constraints.
- Risk preference: aggressive, balanced, or conservative.
- 是否服从专业调剂.

Default guidance for 调剂:

- Recommend 服从专业调剂 unless the user has strong major red lines, high tuition constraints, health/vision limitations, or cannot accept the major group fallback majors.
- Explain that 服从调剂 usually reduces退档风险, but the user must inspect every major included in that professional group before accepting it.

## Batch Handling

- If the user does not specify a batch, default to 本科批 and use the 45-group strategy.
- If the user explicitly asks for 专科批, use the same intake, query, subject-matching, risk, ordering, and output rules, but do not claim the 本科批 45-group quota applies. State the batch clearly in the assumptions.
- If the user asks for 提前批, state that 提前批 is outside this skill's scope and should be handled by the user separately according to official rules and招生章程. Do not draft an提前批 plan with this skill.

## Query Workflow

1. Normalize the candidate profile into `jx-college-pilot` query parameters:
   - `batch=本科` for default 本科批 planning, or the explicit batch requested by the user when supported.
   - `subjectCode` from the subject combination when applicable
   - `hideCoop=1` unless the user accepts Chinese-foreign cooperation
   - `province` for school-location filters only
   - `majorName` for major-field filters
   - `year=all&only2026=1` for recommendations that need both historical admissions and current-year plans
2. Query broadly first by score/rank, subject, batch, and cooperation preference.
3. Query again for preferred provinces and major fields so good options are not missed.
4. Query specific target schools the user names.
5. Preserve important remarks: fees, campus, plan type, color-blindness limits, language limits, gender limits, military/police categories, and other admission restrictions.

## Subject Matching

Treat the candidate's selected subjects as a set and the professional group's requirement as a required set.

- Requirement 不限 or empty: matches any candidate subject combination.
- Requirement 物理: matches candidates who selected 物理, including 物理+化学, 物理+生物, and 物理+化学+生物.
- Requirement 物理+化学: matches only candidates who selected both 物理 and 化学.
- Requirement 物理+生物: matches only candidates who selected both 物理 and 生物.
- Requirement 物理+化学+生物: matches only candidates who selected all three subjects.
- Partial matches are not valid. For example, candidate 物理 does not match requirement 物理+化学, and candidate 物理+化学 does not match requirement 物理+化学+生物.

Exclude non-matching groups from the recommendation table. If a user-named target does not match, list it separately as "不符合选科要求" with a short explanation instead of recommending it.

## Risk Classification

Use rank before score. Lower rank is better.

Let `candidateRank` be the user's rank and `historicalMinRank` be the conservative historical minimum rank selected from 2024/2025. Compute:

```text
rankMargin = (historicalMinRank - candidateRank) / candidateRank
```

Historical-year selection:

- If both 2024 and 2025 rank data exist and their minimum ranks differ by more than 30%, use the more conservative year for classification. Conservative means the smaller minimum rank, because it required a higher candidate position.
- If one year is missing, use the available year and state that confidence is lower.
- If the trend is sharply rising, planned count drops, or admitted count was tiny, classify one risk tier higher even if the formula looks comfortable.

Boundary handling:

- For high-score candidates with `candidateRank < 500`, avoid relying on percentage margins. Use absolute rank gap, score gap, planned count, and trend stability; percentage changes in this range can be misleading.
- If `rankMargin > 100%`, classify the group as 保底 unless there are severe negative factors such as a major planned-count cut, very small plan size, or special restrictions.
- If `candidateRank` is missing, use score gaps only as a fallback and clearly state that rank-based confidence is unavailable.

Interpretation:

- 冲: `rankMargin` is about `-20%` to `0%`, or the 2025 line is slightly above the candidate's score/rank. Use sparingly for desirable schools/majors.
- 稳: `rankMargin` is about `0%` to `15%`, and 2024/2025 trends are not sharply rising.
- 保: `rankMargin` is above `15%`, especially when both 2024 and 2025 were safely below the candidate's rank/score.

Adjust risk after reviewing the 2026 planned count:

- Move risk up if the 2026 planned count decreases sharply, the historical rank rose sharply, or the group has very few seats.
- Move risk down if the 2026 planned count increases, the trend is stable/downward, and admitted counts were healthy.
- If only score is available, classify with score gaps and state that rank-based confidence is missing.

## 45-Group Strategy

For 本科批, plan up to 45 professional groups. For 专科批, use the same strategy shape but do not assert the 本科批 group count.

Default balanced allocation:

- 冲: 10-14 groups
- 稳: 18-22 groups
- 保: 9-13 groups

Adjust allocation:

- Aggressive user: increase 冲 and reduce 保, but keep at least 8 保.
- Conservative user: increase 保 and keep 冲 mostly to high-fit targets.
- Major-first user: reduce pure school-name reaches and prioritize acceptable major groups.
- School-first user: include more school-name reaches, but flag major-group fallback risk clearly.

Quality floor:

- Never fill all 45 slots with weak evidence.
- If usable matching groups are fewer than 30 and the user cannot broaden provinces, majors, tuition, school type, or cooperation preferences, output a shorter list and label the data/choice space insufficient.
- If 稳-layer candidates are fewer than 10, warn that risk is concentrated and suggest broadening acceptable provinces, related majors, or school levels before finalizing.
- Exclude groups with unacceptable tuition, school nature, subject mismatch, or hard restriction conflicts even when more slots are available.

冲-layer review:

- For every 冲 professional group, inspect all majors inside the group before recommending 调剂.
- If the group contains unacceptable fallback majors and the user will not accept 调剂, do not include that group.
- If the user still wants the group, label it as high-risk and state the exact tradeoff.

Ordering:

- Keep the final plan ordered by tier: 冲 first, then 稳, then 保.
- Within the same tier, default to user preference first, then admission probability. A school/major the user strongly wants can rank above a slightly safer option in the same tier.
- Do not place an extremely low-probability 冲 option above all other 冲 options unless it is a clear top preference and the remaining 冲 list still contains more realistic reaches.
- When the user explicitly asks to maximize hit rate, sort within each tier by safer admission evidence first, then preference.

## Output Format

Summarize the plan in Chinese.

Include:

- A fixed disclaimer: 本方案仅供参考，最终填报请以江西省教育考试院官方数据、院校招生章程和志愿填报系统为准。
- Candidate assumptions and unanswered questions.
- Query scope and filters used.
- Overall strategy: risk mix, 调剂 recommendation, and key tradeoffs.
- A table of recommended professional groups with columns:
  `序号`, `层级`, `院校`, `省份`, `办学性质`, `专业组/专业方向`, `选科`, `2024最低分/位次`, `2025最低分/位次`, `2026计划数`, `学费`, `学制`, `调剂建议`, `备注限制`, `理由/风险`.
- Put fee, public/private nature, and key restrictions in the table whenever data is available. If 学制 is unavailable, use `待查招生章程`.
- Separate notes for high-fee/cooperation programs and any restriction that needs official confirmation.
- A final checklist: confirm招生章程, confirm each group includes acceptable majors, confirm health/vision limits, and lock ordering from most desired to safest.

## Decision Rules

- Prefer rank evidence over score evidence.
- Prefer current 2026 plan records when deciding whether a group is still available.
- Do not recommend a professional group whose subject requirement does not match the candidate under the subject-matching rules above.
- Do not hide risk. Label unstable, low-plan-count, high-fee, or restriction-heavy groups.
- Keep the final plan ordered using the ordering rules above.
