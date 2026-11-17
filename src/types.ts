// 类型定义（dev/a）
export interface Env {
  DB: D1Database;
  ADMIN_PASSWORD: string;
  SESSION_SECRET: string;
}

export type PostStatus = 'draft' | 'published';

export interface PostSummaryDTO {
  id: number;
  slug: string;
  title: string;
  summary: string;
  publishedAt: string | null;
  categoryName: string | null;
  tags: string[];
  readingMinutes: number;
}

export interface PostDTO extends PostSummaryDTO {
  content: string;
  status: PostStatus;
  categoryId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryDTO {
  id: number;
  name: string;
  slug: string;
  postCount: number;
}

export interface TagDTO {
  id: number;
  name: string;
  slug: string;
  postCount: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface PostInput {
  title: string;
  slug: string;
  summary?: string;
  content: string;
  categoryId?: number | null;
  tags?: string[];
  status: PostStatus;
}
