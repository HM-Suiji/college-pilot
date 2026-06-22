# 高考录取数据查询 - Next.js 版

江西省 2024-2026 年高考录取数据查询工具，支持院校、专业、分数、排名等多维度筛选。

项目已从纯 HTML/JS/CSS SPA 改造为 TypeScript + Next.js App Router。页面以服务器组件渲染为主，查询状态由路径参数和 search params 驱动，便于 AI 检索、分享和索引。

## 项目结构

```text
miniprogram-web/
├── app/                  # Next.js App Router 页面
├── components/           # 服务器组件
├── lib/                  # 数据展开、筛选解析、检索逻辑
├── skills/               # AI Skills，可安装到支持 Skills 的客户端
├── style.css             # 全局样式
├── alldata.js            # 合并后的高考录取数据（~4.7MB）
├── package.json
├── next.config.ts
└── README.md
```

## 功能特性

- **年份路由**：`/all`、`/2024`、`/2025`、`/2026`
  - 「全部」模式合并同院校+专业组，跨年对比
- **URL 驱动筛选**：省份、批次、院校名称/代号、选科要求、专业组、分数/排名都通过 search params 表达
- **开关筛选**：仅显示 2026 招生、隐藏体育专业、隐藏中外合作办学
- **结果排序**：有分数条件时升序，否则降序
- **URL 分页**：`page` 参数控制显示页数，每页 30 条
- **年份差异对比**：自动检测专业组、批次、性质、收费标准的跨年变化
- **备注折叠**：使用原生 `details/summary`，不引入客户端状态
- **API暴露**：通过 `/api` 路径提供数据展开、筛选解析、检索功能，便于未来 AI 检索或其他前端使用

## 数据说明

数据来自江西省2024-2026年高考录取/志愿填报数据，经处理合并为字符串池压缩格式以提高加载效率。

- 总记录数：74,163 条（2024年: 22,472 / 2025年: 24,712 / 2026年: 26,979）
- 数据文件：`alldata.js`（~4.7MB，gzip 后约 1MB），服务端启动后按需展开并缓存
- 2024-2025年为实际录取数据，2026年为志愿分组参考数据

## 技术栈

- Next.js App Router
- TypeScript
- React Server Components
- 原生 HTML 表单 + search params

## 本地开发

```bash
npm install
npm run dev
```

访问：

```text
http://localhost:3000/all
```

## AI Skills

项目提供了 `jx-college-pilot` skill，用于让支持 Skills 的 AI 客户端直接通过线上 API 查询江西省 2024-2026 年高考录取数据和 2026 年招生计划数据。适用场景包括院校/专业检索、分数和位次筛选、选科要求查询、跨年对比、2026 招生计划分析等。

从 GitHub 仓库安装：

```bash
npx skills install https://github.com/HM-Suiji/college-pilot.git
```

安装后，在支持 Skills 的客户端中提问时可直接描述查询需求，例如：

```text
帮我查南昌大学 2024-2026 年计算机相关专业的录取分数、位次和 2026 计划数
```

## 路由和参数

- `/all`：跨年合并对比
- `/2024`、`/2025`：单年录取数据
- `/2026`：单年计划数据，不显示分数/排名筛选
- `province` / `batch`：可重复出现的多选参数
- `code` / `name` / `major` / `groupCode`：模糊搜索
- `subject`：选科代码，如 `04*05`
- `minScore` / `maxRank`：分数和排名筛选
- `only2026` / `hideSports` / `hideCoop`：开关参数，值为 `1`
- `page`：分页参数

## 项目来源

- 本仓库：[GitHub - HM-Suiji/college-pilot.git](https://github.com/HM-Suiji/college-pilot.git)
- 原始项目：[GitHub - Shirakawa-Kotone/miniprogram-web](https://github.com/Shirakawa-Kotone/miniprogram-web)
- 数据来源：[江西省教育考试院](http://jyks.jxedu.gov.cn/)

特别感谢 [@Shirakawa-Kotone](https://github.com/Shirakawa-Kotone) 的贡献！本项目补足了原项目直接使用SPA单页应用对于状态保持、重复检索、AI检索等方面的不足，提升了用户体验和数据查询效率。
