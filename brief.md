# 立项契约 brief.md（W0 · 团长唯一写入者）

## 1. 目标
开发一个可本地运行、适配 Cloudflare 部署的个人博客系统：支持文章发布/浏览、分类标签、归档搜索与带登录的管理后台，本地通过 `wrangler dev` 验收，本次不部署到 Cloudflare。

## 2. 非目标（明确不做什么）
- 不做多人/多角色权限体系（仅单管理员）
- 不做评论第三方审核、邮件通知、CDN 配置等运维项
- 本次不执行 `wrangler deploy`，不申请生产 D1/KV 资源
- 不做移动端原生 App

## 3. 约束
- 技术栈：Cloudflare Workers + Hono + D1（本地模拟）+ Workers Assets（静态前端）；Node 24 / npm 11
- 模型档位映射：fast = DeepSeek V4.41 Flash；strong / mid = GLM-5.3-Flash（编排器按 team.yaml 调用，本轮由宿主调度执行）
- 时间与成本上限：单轮流水线完成，控制检索轮次
- 合规与安全：管理员密码不落库明文（哈希存储）；SQL 全部参数化
- 外部依赖：仅 npm 包（hono、wrangler），无需 API 密钥即可本地跑通

## 4. 验收标准
- [ ] `npm install && npm run dev` 后本地 `http://localhost:8787` 可访问博客首页
- [ ] 文章列表 / 详情 / 分类 / 标签 / 归档 / 搜索 6 个页面功能可用
- [ ] 管理后台可登录并可发布、编辑、删除文章
- [ ] 契约测试套件全绿（tests_green Gate）
- [ ] wrangler.jsonc 配置含 D1 binding，将来可直接 `wrangler deploy`（本轮不执行）

## 5. 已知材料
| 材料 | 路径 | 允许哪个阶段读 |
|---|---|---|
| 团队骨架与 SOP | agent-team-skeleton-develop/ | 全部波次 |
| 波次总览（生成） | runbook/waves.generated.md | 全部波次 |

## 6. 交付物清单
| 产物 | 路径 | 唯一写入者 |
|---|---|---|
| 立项契约 | project/brief.md | lead |
| Gate 判定记录 | project/gates.md | lead |
| 调研产物 | project/research/*.md | research/* |
| PRD | project/prd.md | prd-writer |
| UI 设计 | project/design/ui-spec.md, design/tokens.yaml | design/ui |
| 架构 / 契约 / 所有权 / CI 骨架 | project/architecture.md, api-contract.yaml, ownership.yaml, ci/*.sh | architect |
| 代码 / 模块测试命令 / 测试 | project/src/, ci/modules/, project/tests/ | dev/*, test/contract |
| 部署记录 | project/deploy.md | release |

## 7. W1 调研切面（决定扇出数量）

| 切面 | 边界：只查什么，明确不查什么 | 来源指引 | 最大检索轮次 |
|---|---|---|---|
| 竞品 / 市场 | 主流个人博客系统的功能集（Halo/Hexo/astro 类），只列功能清单，不做定价分析 | 公开知识 | 12 |
| 用户 / 场景 | 单作者博客用户的核心使用旅程与内容类型，不涉及企业 CMS | 用户目标反推 | 12 |
| 技术 / 代码库 | Cloudflare Workers/D1/Hono 的本地开发与部署适配要点，不调研其他云平台 | 官方文档知识 | 15 |
| 合规 / 约束 | 内容合规底线与管理端鉴权要求，不做法条全文检索 | 常识清单 | 10 |

## 8. 规模与 effort 预算
- L 条件：[x] 新起服务　[x] 有跨模块接口（API 契约）　[x] 改动文件数 > 8
- 判定结果：**L**（全量 SOP，W1≤4、W4≤3）
- 规模规则：L=4+ 成员且职责分明

## 9. 假设与风险
- 假设：本地 `wrangler dev` 默认 local 模式可模拟 D1，无需 Cloudflare 账号
- 风险：wrangler 首次安装耗时；D1 本地 schema 初始化依赖迁移脚本正确性

## 10. Gate 与变更记录
- Gate 1（PRD 定稿）判定人：用户（本轮一次性授权流水线继续）
- Gate 2（契约冻结）判定人：用户（同上）
- Gate 不通过时的动作：只重试本波，不重跑上游

| 时间 | 变更内容 | 影响波次 |
|---|---|---|
| 2026-11-16 | 用户明确：开发完成后仅本地部署验收，不部署 Cloudflare | W6 |
