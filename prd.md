# PRD：个人博客系统（W2 · prd-writer）

> 上游输入：project/brief.md + research/{market,user,tech,compliance}.md 摘要

## 1. 产品定位
单作者个人博客：前台浏览 + 在线 Markdown 管理后台，Cloudflare Workers 原生技术栈，本地可运行、可一键部署。

## 2. 用户与场景
- 作者（管理员）：登录后台写作、发布、管理文章（见 research/user.md 旅程）
- 读者：匿名访问前台浏览、检索

## 3. 功能需求

### F1 前台浏览
| 编号 | 需求 | 验收条件 |
|---|---|---|
| F1.1 | 文章列表分页（每页 10 篇） | 首页展示已发布文章：标题、摘要、日期、分类、标签；分页可用 |
| F1.2 | 文章详情 | Markdown 渲染（代码高亮）、显示阅读时间与发布日期 |
| F1.3 | 分类页 | 点击分类列出该分类文章 |
| F1.4 | 标签页 | 标签云 + 点击标签筛选文章 |
| F1.5 | 归档页 | 按年月分组列出全部已发布文章 |
| F1.6 | 搜索 | 关键词匹配标题或正文（LIKE），结果分页 |
| F1.7 | 关于页 | 静态介绍页 |

### F2 管理后台
| 编号 | 需求 | 验收条件 |
|---|---|---|
| F2.1 | 登录 | 密码登录，错误提示；未登录访问 /admin 重定向到登录页 |
| F2.2 | 文章编辑器 | 标题、Markdown 正文、分类（下拉）、标签（逗号分隔）、状态（草稿/发布）、实时预览 |
| F2.3 | 文章管理列表 | 全部文章（含草稿）、编辑、删除（二次确认） |
| F2.4 | 发布即生效 | 保存为"发布"后前台立即可见，无需构建 |

### F3 数据模型（摘要）
- posts: id, slug, title, summary, content(md), category_id, status(draft/published), published_at, created_at, updated_at
- categories: id, name, slug
- tags: id, name, slug；post_tags: post_id, tag_id

## 4. 非功能需求
- N1 响应式布局（移动端可读）
- N2 管理端鉴权与密码哈希（见 research/compliance.md）
- N3 全部 SQL 参数化；前台 XSS 防护
- N4 Cloudflare 兼容：无 Node 专有 API；D1 binding；静态资产走 Workers Assets

## 5. 页面清单（验收条件 → 页面映射）
/ 首页列表 · /post/:slug 详情 · /category/:slug 分类 · /tags 标签 · /tag/:slug 标签筛选 · /archive 归档 · /search?q= 搜索 · /about 关于 · /admin/login 登录 · /admin 文章管理 · /admin/edit/:id 或 /admin/new 编辑器

## 6. 边界与不做
评论系统、多用户、RSS/SEO 深度优化、部署到 Cloudflare（本轮）——均不做，留扩展点。

## 7. 验收清单（acceptance Gate 依据）
- [ ] `npm run dev` 本地启动成功，前台 8 个页面可用（F1.1–F1.7 + /about）
- [ ] 后台登录、新建/编辑/删除文章可用（F2.1–F2.4）
- [ ] 草稿前台不可见，发布立即可见
- [ ] 契约测试全绿
- [ ] wrangler.jsonc 含 D1 binding 与 assets 配置，未执行 deploy
