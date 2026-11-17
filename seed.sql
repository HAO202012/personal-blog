-- 本地演示数据（dev/a）
INSERT OR IGNORE INTO categories (name, slug) VALUES ('技术', 'tech');
INSERT OR IGNORE INTO categories (name, slug) VALUES ('生活', 'life');

INSERT OR IGNORE INTO tags (name, slug) VALUES ('Cloudflare', 'cloudflare');
INSERT OR IGNORE INTO tags (name, slug) VALUES ('JavaScript', 'javascript');
INSERT OR IGNORE INTO tags (name, slug) VALUES ('随笔', 'essay');
INSERT OR IGNORE INTO tags (name, slug) VALUES ('教程', 'tutorial');

INSERT OR IGNORE INTO posts (slug, title, summary, content, category_id, status, published_at) VALUES
(
  'hello-cloudflare',
  '你好，Cloudflare Workers',
  '为什么把博客建在边缘上：零运维、秒级冷启动，以及 D1 让动态博客也变得简单。',
  '## 为什么是 Workers\n\n把博客建在 Cloudflare Workers 上有三个理由：\n\n1. **零运维**：没有服务器要维护\n2. **全球边缘分发**：读者在哪都快\n3. **D1 数据库**：动态内容不再需要构建流程\n\n## 一段示例代码\n\n```js\nexport default {\n  async fetch(request, env) {\n    const posts = await env.DB.prepare(\n      ''SELECT * FROM posts WHERE status = ?''\n    ).bind(''published'').all();\n    return new Response(JSON.stringify(posts));\n  }\n}\n```\n\n写起来就是这么直接。',
  (SELECT id FROM categories WHERE slug = 'tech'),
  'published',
  '2026-11-01 09:00:00'
),
(
  'hono-notes',
  'Hono 框架使用心得',
  '轻量、类型安全、跑在任意 JS 运行时。记录路由分组、中间件与 cookie 处理的常用姿势。',
  '## 路由分组\n\n```ts\nconst app = new Hono();\nconst api = app.basePath(''/api'');\napi.get(''/posts'', (c) => c.json({ ok: true }));\n```\n\n## 中间件做鉴权\n\n```ts\nadmin.use(''/posts*'', async (c, next) => {\n  if (!(await verify(c))) return c.json({ error: ''unauthorized'' }, 401);\n  await next();\n});\n```\n\n中间件的执行顺序就是注册顺序，鉴权中间件要写在具体路由之前。',
  (SELECT id FROM categories WHERE slug = 'tech'),
  'published',
  '2026-11-08 14:30:00'
),
(
  'weekend-essay',
  '周末的咖啡馆',
  '写代码累了，去街角的咖啡馆坐了一下午，观察来往的人，想明白了一些小事。',
  '周六下午去了街角新开的咖啡馆，靠窗的位置刚好能看见梧桐树。\n\n点了一杯手冲，埃塞俄比亚豆子，带一点果酸。翻了三十页书，剩下的时间都在看窗外的行人——每个人都有自己要去的方向。\n\n回来路上想：写博客大概也是这样，不必每个人都读完，写给自己和刚好路过的人就够了。',
  (SELECT id FROM categories WHERE slug = 'life'),
  'published',
  '2026-11-14 20:00:00'
),
(
  'draft-future-post',
  '（草稿）尚未完成的文章',
  '这篇是草稿，前台不应该看到它。',
  '还没写完。',
  (SELECT id FROM categories WHERE slug = 'tech'),
  'draft',
  NULL
);

INSERT OR IGNORE INTO post_tags (post_id, tag_id)
SELECT p.id, t.id FROM posts p, tags t
WHERE (p.slug = 'hello-cloudflare' AND t.slug IN ('cloudflare', 'javascript', '教程'))
   OR (p.slug = 'hono-notes' AND t.slug IN ('javascript', '教程'))
   OR (p.slug = 'weekend-essay' AND t.slug IN ('随笔'));
