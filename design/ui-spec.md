# UI 规格（W3D · design/ui）

> 输入：prd.md 第 5 节页面清单 + architecture.md 前端约束（静态页 + query 路由 + tokens.yaml）

## 设计原则
干净、内容优先的个人博客风：浅色底、衬线标题 + 无衬线正文、充足留白、移动端单栏。

## 验收条件 → 页面映射
| PRD 验收条件 | 页面 | 关键组件 |
|---|---|---|
| F1.1 列表分页 | index.html | TopNav / PostCard / Pagination |
| F1.2 详情 | post.html | TopNav / Article(md 渲染+高亮) / TagPills / PrevNext |
| F1.3 分类 | category.html | TopNav / PostList / Breadcrumb |
| F1.4 标签 | tags.html | TopNav / TagCloud；tag.html 复用 PostList |
| F1.5 归档 | archive.html | TopNav / ArchiveTree（按年>月分组） |
| F1.6 搜索 | search.html | TopNav / SearchBox / PostList / Pagination |
| F1.7 关于 | about.html | TopNav / Prose |
| F2.1–F2.4 后台 | admin-login.html / admin.html / admin-editor.html | LoginForm / AdminTable / Editor(title+status+category+tags+md preview) |

## 共享组件
- TopNav：站名（左）+ 首页/归档/标签/关于/搜索入口（右）；移动端折行。
- PostCard：标题(h2)、摘要 2 行截断、meta 行（日期 · 分类 · 阅读时间）、标签 pills。
- Pagination：上一页/下一页 + 页码。
- Footer：© 年份 + 站名。

## 交互说明
- 后台编辑器：正文 textarea 左、预览右（桌面分栏、移动单栏切换）；「保存草稿 / 发布」双按钮；删除需 confirm()。
- 登录失败行内错误提示；/admin 未登录前端先调 /api/admin/posts，401 则跳 admin-login.html。
- 全部静态页共享 main.css + main.js（fetch 封装 + 渲染函数），标签/分类跳转带 query 参数。

## 布局
- 容器 max-width 720px 居中；后台编辑器 960px。
- 断点：≤640px 单栏，字号略降。
