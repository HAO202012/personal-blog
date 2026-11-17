// 管理 API（dev/a，契约 admin 段）
import { Hono } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Env, PostInput, PostStatus } from '../types';
import { SESSION_COOKIE, createSessionToken, verifySessionToken } from '../auth';
import { ValidationError, createPost, deletePost, getAdminPost, listPosts, updatePost } from '../db';

export const admin = new Hono<{ Bindings: Env }>();

// ---- 鉴权 ----
admin.post('/login', async (c) => {
  const body = await c.req.json<{ password?: string }>().catch(() => null);
  if (!body || !body.password) return c.json({ error: '缺少 password' }, 400);
  if (body.password !== c.env.ADMIN_PASSWORD) return c.json({ error: '密码错误' }, 401);
  const token = await createSessionToken(c.env.SESSION_SECRET);
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
  return c.json({ ok: true });
});

admin.post('/logout', (c) => {
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
  return c.json({ ok: true });
});

// /api/admin/*（login/logout 除外）需要会话
admin.use('/posts', async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (!(await verifySessionToken(token, c.env.SESSION_SECRET))) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  await next();
});
admin.use('/posts/*', async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (!(await verifySessionToken(token, c.env.SESSION_SECRET))) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  await next();
});

function parseInput(body: unknown): PostInput | string {
  const b = body as Partial<PostInput> | null;
  if (!b || typeof b !== 'object') return '请求体无效';
  const status: PostStatus = b.status === 'published' ? 'published' : b.status === 'draft' ? 'draft' : ('' as PostStatus);
  if (status !== 'draft' && status !== 'published') return 'status 必须是 draft 或 published';
  if (typeof b.title !== 'string' || typeof b.slug !== 'string' || typeof b.content !== 'string') {
    return 'title/slug/content 必须是字符串';
  }
  return {
    title: b.title,
    slug: b.slug,
    summary: typeof b.summary === 'string' ? b.summary : '',
    content: b.content,
    categoryId: typeof b.categoryId === 'number' ? b.categoryId : null,
    tags: Array.isArray(b.tags) ? b.tags.filter((t) => typeof t === 'string') : [],
    status,
  };
}

function handleValidationError(c: { json: (o: unknown, s: number) => Response }, e: unknown) {
  if (e instanceof ValidationError) return c.json({ error: e.message }, 400);
  throw e;
}

// ---- CRUD ----
admin.get('/posts', async (c) => {
  const page = Number(c.req.query('page')) || 1;
  const size = Number(c.req.query('size')) || 20;
  return c.json(await listPosts(c.env, { page, size, publishedOnly: false }));
});

admin.get('/posts/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.json({ error: '无效 id' }, 400);
  const post = await getAdminPost(c.env, id);
  if (!post) return c.json({ error: 'not found' }, 404);
  return c.json(post);
});

admin.post('/posts', async (c) => {
  const parsed = parseInput(await c.req.json().catch(() => null));
  if (typeof parsed === 'string') return c.json({ error: parsed }, 400);
  try {
    const result = await createPost(c.env, parsed);
    if ('conflict' in result) return c.json({ error: 'slug 已存在' }, 409);
    return c.json(result, 201);
  } catch (e) {
    return handleValidationError(c, e);
  }
});

admin.put('/posts/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.json({ error: '无效 id' }, 400);
  const parsed = parseInput(await c.req.json().catch(() => null));
  if (typeof parsed === 'string') return c.json({ error: parsed }, 400);
  try {
    const result = await updatePost(c.env, id, parsed);
    if (result === null) return c.json({ error: 'not found' }, 404);
    if ('conflict' in result) return c.json({ error: 'slug 已存在' }, 409);
    return c.json(result);
  } catch (e) {
    return handleValidationError(c, e);
  }
});

admin.delete('/posts/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.json({ error: '无效 id' }, 400);
  const ok = await deletePost(c.env, id);
  if (!ok) return c.json({ error: 'not found' }, 404);
  return c.json({ ok: true });
});
