import { defineType, rel, type InferType } from 'trellis/schema';
import { z } from 'zod';

/** A user in the social graph. */
export const Person = defineType(
  'Person',
  {
    name: z.string().min(1),
    bio: z.string().default(''),
    avatarUrl: z.string().url().optional(),
  },
  {
    title: 'name',
    relations: {
      posts: rel('Post', 'many'),
    },
  },
);

/** Thematic tag for categorizing posts. */
export const Tag = defineType(
  'Tag',
  {
    label: z.string().min(1),
  },
  { title: 'label' },
);

/**
 * A social post.
 * Graph: Post --author--> Person, Post --tags--> Tag[]
 */
export const Post = defineType(
  'Post',
  {
    content: z.string().min(1),
    published: z.boolean().default(false),
    likes: z.number().default(0),
    reposts: z.number().default(0),
    imageUrl: z.string().optional(),
  },
  {
    title: 'content',
    relations: {
      author: rel(() => Person),
      tags: rel(() => Tag, 'many'),
    },
  },
);

export type PersonT = InferType<typeof Person>;
export type TagT = InferType<typeof Tag>;
export type PostT = InferType<typeof Post>;

export const SOCIAL_TYPES = [Person, Tag, Post] as const;
