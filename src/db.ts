// 数据访问层（dev/a）：全部参数化查询，契约 DTO 映射
import type { Env, Paged, PostDTO, PostInput, PostSummaryDTO, CategoryDTO, TagDTO } from './types';

const READING_WPM = 400;

function readingMinutes(content: string | number): number {
  const len = typeof content === 'number' ? content : content.length;
  return Math.max(1, Math.ceil(len / READING_WPM));
}

function slugifyTag(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-');
}

interface PostRow {
  id: number;
  slug: string;
  title: string;
  summary: string;
  content: string;
  content_len: number;
  category_id: number | null;
  category_name: string | null;
  status: 'draft' | 'published';
  published_at: string | null;
  created_at: string;
  updated_at: string;
  tags: string | null;
}

const POST_SELECT = `
  SELECT p.id, p.slug, p.title, p.summary, p.content, length(p.content) AS content_len,
         p.category_id, c.name AS category_name, p.status, p.published_at, p.created_at, p.updated_at,
         (SELECT group_concat(t.name, ',') FROM post_tags pt JOIN tags t ON t.id = pt.tag_id
          WHERE pt.post_id = p.id) AS tags
  FROM posts p
  LEFT JOIN categories c ON c.id = p.category_id
`;

function toSummary(r: PostRow): PostSummaryDTO {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    publishedAt: r.published_at,
    categoryName: r.category_name,
    tags: r.tags ? r.tags.split(',') : [],
    readingMinutes: readingMinutes(r.content_len),
  };
}

function toPost(r: PostRow): PostDTO {
  return {
    ...toSummary(r),
    content: r.content,
    status: r.status,
    categoryId: r.category_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listPosts(
  env: Env,
  opts: { page?: number; size?: number; category?: string; tag?: string; publishedOnly?: boolean },
): Promise<Paged<PostSummaryDTO>> {
  const page = Math.max(1, opts.page ?? 1);
  const size = Math.min(50, Math.max(1, opts.size ?? 10));
  const where: string[] = [];
  const binds: (string | number)[] = [];
  if (opts.publishedOnly !== false) where.push(`p.status = 'published'`);
  if (opts.category) {
    where.push('c.slug = ?');
    binds.push(opts.category);
  }
  if (opts.tag) {
    where.push(
      'p.id IN (SELECT pt.post_id FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE t.slug = ?)',
    );
    binds.push(opts.tag);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const totalRow = await env.DB.prepare(
    `SELECT count(*) AS n FROM posts p LEFT JOIN categories c ON c.id = p.category_id ${whereSql}`,
  )
    .bind(...binds)
    .first<{ n: number }>();
  const total = totalRow?.n ?? 0;
  const offset = (page - 1) * size;
  const { results } = await env.DB.prepare(
    `${POST_SELECT} ${whereSql} ORDER BY p.published_at DESC, p.id DESC LIMIT ? OFFSET ?`,
  )
    .bind(...binds, size, offset)
    .all<PostRow>();
  return { items: results.map(toSummary), total, page, size };
}

export async function getPostBySlug(env: Env, slug: string): Promise<PostDTO | null> {
  const row = await env.DB.prepare(`${POST_SELECT} WHERE p.slug = ? AND p.status = 'published'`)
    .bind(slug)
    .first<PostRow>();
  return row ? toPost(row) : null;
}

export async function getAdminPost(env: Env, id: number): Promise<PostDTO | null> {
  const row = await env.DB.prepare(`${POST_SELECT} WHERE p.id = ?`).bind(id).first<PostRow>();
  return row ? toPost(row) : null;
}

export async function listCategories(env: Env): Promise<CategoryDTO[]> {
  const { results } = await env.DB.prepare(`
    SELECT c.id, c.name, c.slug,
           (SELECT count(*) FROM posts p WHERE p.category_id = c.id AND p.status = 'published') AS postCount
    FROM categories c ORDER BY c.id
  `).all<CategoryDTO>();
  return results;
}

export async function listTags(env: Env): Promise<TagDTO[]> {
  const { results } = await env.DB.prepare(`
    SELECT t.id, t.name, t.slug,
           (SELECT count(*) FROM post_tags pt JOIN posts p ON p.id = pt.post_id
            WHERE pt.tag_id = t.id AND p.status = 'published') AS postCount
    FROM tags t ORDER BY t.id
  `).all<TagDTO>();
  return results;
}

export interface ArchiveMonth {
  month: number;
  posts: PostSummaryDTO[];
}
export interface ArchiveYear {
  year: number;
  months: ArchiveMonth[];
}

export async function getArchive(env: Env): Promise<ArchiveYear[]> {
  const { results } = await env.DB.prepare(
    `${POST_SELECT} WHERE p.status = 'published' ORDER BY p.published_at DESC, p.id DESC`,
  ).all<PostRow>();
  const years = new Map<number, ArchiveMonth[]>();
  for (const r of results.map(toSummary)) {
    const d = r.publishedAt ?? '';
    const year = Number(d.slice(0, 4));
    const month = Number(d.slice(5, 7));
    if (!Number.isFinite(year) || !Number.isFinite(month)) continue;
    if (!years.has(year)) years.set(year, []);
    const months = years.get(year)!;
    let m = months.find((x) => x.month === month);
    if (!m) {
      m = { month, posts: [] };
      months.push(m);
    }
    m.posts.push(r);
  }
  return [...years.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, months]) => ({ year, months: months.sort((a, b) => b.month - a.month) }));
}

export async function searchPosts(
  env: Env,
  q: string,
  page: number,
  size: number,
): Promise<Paged<PostSummaryDTO>> {
  const like = `%${q}%`;
  const totalRow = await env.DB.prepare(
    `SELECT count(*) AS n FROM posts p WHERE p.status = 'published' AND (p.title LIKE ?1 OR p.content LIKE ?1)`,
  )
    .bind(like)
    .first<{ n: number }>();
  const { results } = await env.DB.prepare(
    `${POST_SELECT} WHERE p.status = 'published' AND (p.title LIKE ?1 OR p.content LIKE ?1)
     ORDER BY p.published_at DESC LIMIT ?2 OFFSET ?3`,
  )
    .bind(like, size, (page - 1) * size)
    .all<PostRow>();
  return { items: results.map(toSummary), total: totalRow?.n ?? 0, page, size };
}

async function upsertTags(env: Env, names: string[]): Promise<number[]> {
  const ids: number[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const slug = slugifyTag(name);
    const existing = await env.DB.prepare('SELECT id FROM tags WHERE slug = ?1 OR name = ?2')
      .bind(slug, name)
      .first<{ id: number }>();
    if (existing) {
      ids.push(existing.id);
    } else {
      const res = await env.DB.prepare('INSERT INTO tags (name, slug) VALUES (?1, ?2)')
        .bind(name, slug)
        .run();
      ids.push(res.meta.last_row_id);
    }
  }
  return ids;
}

const SLUG_RE = /^[a-z0-9-]+$/;

function validateInput(input: PostInput): string | null {
  if (!input.title?.trim()) return '标题不能为空';
  if (!input.slug?.trim()) return 'slug 不能为空';
  if (!SLUG_RE.test(input.slug)) return 'slug 只能包含小写字母、数字和连字符';
  if (input.content == null) return '正文不能为空';
  if (input.status !== 'draft' && input.status !== 'published') return 'status 必须是 draft 或 published';
  return null;
}

export async function createPost(env: Env, input: PostInput): Promise<PostDTO | { conflict: true }> {
  const err = validateInput(input);
  if (err) throw new ValidationError(err);
  const dup = await env.DB.prepare('SELECT id FROM posts WHERE slug = ?1').bind(input.slug).first();
  if (dup) return { conflict: true };
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const publishedAt = input.status === 'published' ? now : null;
  const res = await env.DB.prepare(
    `INSERT INTO posts (slug, title, summary, content, category_id, status, published_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
  )
    .bind(input.slug, input.title.trim(), input.summary ?? '', input.content, input.categoryId ?? null, input.status, publishedAt)
    .run();
  const id = res.meta.last_row_id;
  const tagIds = await upsertTags(env, input.tags ?? []);
  if (tagIds.length) {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES ${tagIds.map(() => '(?, ?)').join(', ')}`,
    ).bind(...tagIds.flatMap((t) => [id, t])).run();
  }
  const post = await getAdminPost(env, id);
  return post!;
}

export class ValidationError extends Error {}

export async function updatePost(
  env: Env,
  id: number,
  input: PostInput,
): Promise<PostDTO | null | { conflict: true }> {
  const err = validateInput(input);
  if (err) throw new ValidationError(err);
  const existing = await env.DB.prepare('SELECT id, published_at FROM posts WHERE id = ?1').bind(id).first<{ id: number; published_at: string | null }>();
  if (!existing) return null;
  const dup = await env.DB.prepare('SELECT id FROM posts WHERE slug = ?1 AND id != ?2').bind(input.slug, id).first();
  if (dup) return { conflict: true };
  const publishedAt =
    input.status === 'published' ? (existing.published_at ?? new Date().toISOString().slice(0, 19).replace('T', ' ')) : null;
  await env.DB.prepare(
    `UPDATE posts SET slug = ?1, title = ?2, summary = ?3, content = ?4, category_id = ?5,
       status = ?6, published_at = ?7, updated_at = ?8 WHERE id = ?9`,
  )
    .bind(input.slug, input.title.trim(), input.summary ?? '', input.content, input.categoryId ?? null, input.status, publishedAt,
      new Date().toISOString().slice(0, 19).replace('T', ' '), id)
    .run();
  await env.DB.prepare('DELETE FROM post_tags WHERE post_id = ?1').bind(id).run();
  const tagIds = await upsertTags(env, input.tags ?? []);
  if (tagIds.length) {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES ${tagIds.map(() => '(?, ?)').join(', ')}`,
    ).bind(...tagIds.flatMap((t) => [id, t])).run();
  }
  return getAdminPost(env, id);
}

export async function deletePost(env: Env, id: number): Promise<boolean> {
  const existing = await env.DB.prepare('SELECT id FROM posts WHERE id = ?1').bind(id).first();
  if (!existing) return false;
  await env.DB.prepare('DELETE FROM post_tags WHERE post_id = ?1').bind(id).run();
  await env.DB.prepare('DELETE FROM posts WHERE id = ?1').bind(id).run();
  return true;
}
