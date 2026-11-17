// 前台公开 API（dev/a，契约 public 段）
import { Hono } from 'hono';
import type { Env } from '../types';
import { getArchive, getPostBySlug, listCategories, listPosts, listTags, searchPosts } from '../db';

export const api = new Hono<{ Bindings: Env }>();

api.get('/posts', async (c) => {
  const page = Number(c.req.query('page')) || 1;
  const size = Number(c.req.query('size')) || 10;
  const category = c.req.query('category') || undefined;
  const tag = c.req.query('tag') || undefined;
  const data = await listPosts(c.env, { page, size, category, tag, publishedOnly: true });
  return c.json(data);
});

api.get('/posts/:slug', async (c) => {
  const post = await getPostBySlug(c.env, c.req.param('slug'));
  if (!post) return c.json({ error: 'not found' }, 404);
  return c.json(post);
});

api.get('/categories', async (c) => c.json(await listCategories(c.env)));
api.get('/tags', async (c) => c.json(await listTags(c.env)));
api.get('/archive', async (c) => c.json(await getArchive(c.env)));

api.get('/search', async (c) => {
  const q = (c.req.query('q') || '').trim();
  if (!q) return c.json({ error: '缺少搜索词 q' }, 400);
  const page = Number(c.req.query('page')) || 1;
  const size = Number(c.req.query('size')) || 10;
  return c.json(await searchPosts(c.env, q, page, size));
});
