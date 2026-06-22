# 高考录取数据查询 - Next.js 版

江西省 2024-2026 年高考录取数据查询工具，支持院校、专业、分数、排名等多维度筛选。

项目已从纯 HTML/JS/CSS SPA 改造为 TypeScript + Next.js App Router。页面以服务器组件渲染为主，查询状态由路径参数和 search params 驱动，便于 AI 检索、分享和索引。

## 项目结构

```text
miniprogram-web/
├── app/                  # Next.js App Router 页面
├── components/           # 服务器组件
├── lib/                  # 数据展开、筛选解析、检索逻辑
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
