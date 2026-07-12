<script setup lang="ts">
import { useBreakpoints, breakpointsTailwind, useLocalStorage } from '@vueuse/core';
import { resolveRelations } from 'trellis/schema';
import { useMutation } from 'trellis/vue/typed';
import { Post, type PersonT, type TagT } from '~/lib/schemas/social';

const PAGE_SIZE = 24;

type PostLoaded = {
  id: string;
  content: string;
  published: boolean;
  likes?: number;
  reposts?: number;
  author: PersonT | string;
  tags: Array<TagT | string>;
};

const client = useTrellis();
const postMutations = useMutation(client, Post);

// Local pagination/live state
const items = ref<PostLoaded[]>([]);
const offset = ref(0);
const total = ref<number | null>(null);
const loading = ref(false);
const error = ref<Error | null>(null);
const sentinel = useTemplateRef<HTMLElement>('sentinel');

// Tabs and favorites
const activeTab = ref<'feed' | 'saved'>('feed');
const savedPosts = useLocalStorage<Record<string, boolean>>('trellis-social:saved', {});
const likedPosts = useLocalStorage<Record<string, boolean>>('trellis-social:liked', {});
const repostedPostId = ref<string | null>(null);

const savedCount = computed(() => {
  return Object.keys(savedPosts.value).filter((key) => savedPosts.value[key]).length;
});

// Responsive column distribution
const breakpoints = useBreakpoints(breakpointsTailwind);
const isLg = breakpoints.greaterOrEqual('lg');
const isSm = breakpoints.greaterOrEqual('sm');

const colsCount = computed(() => {
  if (isLg.value) return 3;
  if (isSm.value) return 2;
  return 1;
});

const itemsWithIndex = computed(() => {
  const list = activeTab.value === 'saved'
    ? items.value.filter((p) => savedPosts.value[p.id])
    : items.value;
  return list.map((item, index) => ({ item, index }));
});

const columns = computed(() => {
  const count = colsCount.value;
  const buckets: Array<Array<{ item: PostLoaded; index: number }>> = Array.from(
    { length: count },
    () => [],
  );
  itemsWithIndex.value.forEach((entry, idx) => {
    buckets[idx % count]?.push(entry);
  });
  return buckets;
});

const hasMore = computed(() => {
  if (activeTab.value === 'saved') return false;
  if (total.value === null) return true;
  return items.value.length < total.value;
});

const seen = new Set<string>();

async function loadMore() {
  if (loading.value || !hasMore.value || activeTab.value === 'saved') return;
  loading.value = true;
  error.value = null;
  try {
    const page = await client.list('Post', {
      limit: PAGE_SIZE,
      offset: offset.value,
    });
    total.value = page.total;
    const resolved = (await resolveRelations(client, Post, page.data, {
      author: true,
      tags: true,
    })) as unknown as PostLoaded[];

    for (const p of resolved) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      items.value.push(p);
    }
    offset.value += page.data.length;
    if (page.data.length === 0) total.value = items.value.length;
  } catch (err) {
    error.value = err instanceof Error ? err : new Error(String(err));
  } finally {
    loading.value = false;
  }
}

useIntersectionObserver(
  sentinel,
  ([entry]) => {
    if (entry?.isIntersecting) void loadMore();
  },
  { root: null, rootMargin: '480px', threshold: 0 },
);

onMounted(() => {
  void loadMore();
});

// Interactive Affordances
async function toggleLike(p: PostLoaded) {
  const isLiked = likedPosts.value[p.id];
  const currentLikes = typeof p.likes === 'number' ? p.likes : 0;
  const newLikes = isLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;

  // Optimistic update
  const item = items.value.find((i) => i.id === p.id);
  if (item) item.likes = newLikes;

  if (isLiked) {
    delete likedPosts.value[p.id];
  } else {
    likedPosts.value[p.id] = true;
  }

  try {
    await postMutations.update(p.id, { likes: newLikes });
  } catch (err) {
    console.error('Failed to update likes:', err);
    if (item) item.likes = currentLikes;
    if (isLiked) likedPosts.value[p.id] = true;
    else delete likedPosts.value[p.id];
  }
}

function toggleSaved(p: PostLoaded) {
  if (savedPosts.value[p.id]) {
    delete savedPosts.value[p.id];
  } else {
    savedPosts.value[p.id] = true;
  }
}

async function repost(p: PostLoaded) {
  try {
    const currentReposts = typeof p.reposts === 'number' ? p.reposts : 0;
    await postMutations.update(p.id, { reposts: currentReposts + 1 });
    repostedPostId.value = p.id;
    setTimeout(() => {
      if (repostedPostId.value === p.id) repostedPostId.value = null;
    }, 2000);
  } catch (err) {
    console.error('Failed to repost:', err);
  }
}

function authorName(author: PersonT | string | undefined): string {
  if (!author) return 'Unknown';
  if (typeof author === 'string') return author;
  return author.name;
}

function authorBio(author: PersonT | string | undefined): string {
  if (!author || typeof author === 'string') return '';
  return author.bio ?? '';
}

function tagLabel(tag: TagT | string): string {
  if (typeof tag !== 'string') return tag.label;
  const slug = tag.startsWith('tag:') ? tag.slice(4) : tag;
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
</script>

<template>
  <div class="space-y-6">
    <!-- Filter Navigation Tabs -->
    <div class="flex items-center justify-between border-b border-border/40 pb-3">
      <div class="flex gap-6 text-sm">
        <button @click="activeTab = 'feed'"
          class="relative py-2 font-medium tracking-tight transition-colors hover:text-foreground"
          :class="activeTab === 'feed' ? 'text-foreground' : 'text-muted-foreground'">
          Feed
          <span v-if="activeTab === 'feed'"
            class="absolute inset-x-0 -bottom-3 h-[2px] bg-brass animate-in fade-in duration-300" />
        </button>
        <button @click="activeTab = 'saved'"
          class="relative py-2 font-medium tracking-tight transition-colors hover:text-foreground flex items-center gap-1.5"
          :class="activeTab === 'saved' ? 'text-foreground' : 'text-muted-foreground'">
          Saved
          <span class="rounded-full bg-muted/80 px-2 py-0.5 text-[11px] font-mono font-medium border border-border/30">
            {{ savedCount }}
          </span>
          <span v-if="activeTab === 'saved'"
            class="absolute inset-x-0 -bottom-3 h-[2px] bg-brass animate-in fade-in duration-300" />
        </button>
      </div>
    </div>

    <!-- Empty/Loading States -->
    <p v-if="loading && items.length === 0" class="text-sm text-muted-foreground">
      Loading feed…
    </p>
    <p v-else-if="error && items.length === 0" class="text-sm text-destructive">
      {{ error.message }}
    </p>
    <div v-else-if="itemsWithIndex.length === 0" class="py-12 text-center space-y-2">
      <p class="text-sm text-muted-foreground">
        {{ activeTab === 'saved' ? 'No saved posts yet. Bookmark posts to save them here.' : 'No posts found.' }}
      </p>
      <p v-if="activeTab === 'feed' && items.length === 0" class="text-xs text-muted-foreground/80">
        Seed data with the import script while the DB is running.
      </p>
    </div>

    <!-- Distributed Masonry Grid -->
    <div v-else class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="(col, colIdx) in columns" :key="colIdx" class="flex flex-col gap-5">
        <article v-for="entry in col" :key="entry.item.id"
          class="feed-card rounded-xl border border-border/50 bg-card/75 p-5 shadow-sm backdrop-blur-[2px] transition-[transform,box-shadow,background-color] duration-300 hover:-translate-y-0.5 hover:shadow-md hover:bg-card"
          :style="{ animationDelay: `${(entry.index % PAGE_SIZE) * 28}ms` }">
          <!-- Post content -->
          <p class="text-[0.95rem] leading-relaxed text-foreground whitespace-pre-line">
            {{ entry.item.content }}
          </p>

          <!-- Author details -->
          <div class="mt-4 flex items-center gap-3">
            <img v-if="typeof entry.item.author !== 'string' && entry.item.author?.avatarUrl"
              :src="entry.item.author.avatarUrl"
              :alt="authorName(entry.item.author)"
              class="w-8 h-8 rounded-full object-cover ring-2 ring-border/30" />
            <div v-else class="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
              {{ authorName(entry.item.author).charAt(0).toUpperCase() }}
            </div>
            <div>
              <p class="text-sm font-medium tracking-tight">
                {{ authorName(entry.item.author) }}
              </p>
              <p v-if="authorBio(entry.item.author)" class="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                {{ authorBio(entry.item.author) }}
              </p>
            </div>
          </div>

          <!-- Tags -->
          <div v-if="entry.item.tags?.length" class="mt-4 flex flex-wrap gap-1.5">
            <span v-for="(tag, ti) in entry.item.tags" :key="typeof tag === 'string' ? tag : tag.id ?? ti"
              class="rounded-md bg-muted/60 px-2 py-0.5 text-[11px] tracking-wide text-muted-foreground">
              {{ tagLabel(tag) }}
            </span>
          </div>

          <!-- Bottom Actions Bar -->
          <div class="mt-5 pt-4 border-t border-border/30 flex items-center justify-between text-muted-foreground/80">
            <div class="flex items-center gap-1">
              <!-- Like Button -->
              <button @click="toggleLike(entry.item)"
                class="group flex items-center gap-1.5 rounded-md p-1.5 text-xs hover:bg-muted/80 hover:text-foreground transition-all duration-200"
                :class="{ 'text-rose-500 hover:text-rose-600': likedPosts[entry.item.id] }" aria-label="Like post">
                <Icon name="lucide:heart" class="w-4 h-4 transition-transform group-active:scale-75 duration-200"
                  :class="{ 'fill-rose-500 text-rose-500': likedPosts[entry.item.id] }" />
                <span class="font-mono text-[11px] font-medium">{{ entry.item.likes ?? 0 }}</span>
              </button>
            </div>

            <div class="flex items-center gap-1">
              <!-- Repost Button -->
              <button @click="repost(entry.item)"
                class="rounded-md p-1.5 text-xs hover:bg-muted/80 hover:text-foreground transition-all duration-200"
                :class="{ 'text-green-600': repostedPostId === entry.item.id }" aria-label="Repost">
                <Icon :name="repostedPostId === entry.item.id ? 'lucide:check' : 'lucide:repeat'"
                  class="w-4 h-4 transition-transform active:scale-75 duration-200" />
              </button>

              <!-- Save Button -->
              <button @click="toggleSaved(entry.item)"
                class="group rounded-md p-1.5 text-xs hover:bg-muted/80 hover:text-foreground transition-all duration-200"
                :class="{ 'text-amber-500 hover:text-amber-600': savedPosts[entry.item.id] }"
                aria-label="Save post">
                <Icon name="lucide:bookmark" class="w-4 h-4 transition-transform group-active:scale-75 duration-200"
                  :class="{ 'fill-amber-500 text-amber-500': savedPosts[entry.item.id] }" />
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>

    <!-- Scroll Sentinel -->
    <div ref="sentinel" class="flex min-h-12 items-center justify-center py-6" aria-hidden="true">
      <p v-if="loading && items.length > 0" class="text-xs text-muted-foreground">
        Loading more…
      </p>
      <p v-else-if="!hasMore && items.length > 0 && activeTab !== 'saved'"
        class="text-xs tracking-wide text-muted-foreground">
        {{ items.length.toLocaleString() }} posts
      </p>
      <p v-else-if="error && items.length > 0" class="text-xs text-destructive">
        {{ error.message }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.feed-card {
  animation: feed-in 0.45s ease-out both;
}

@keyframes feed-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .feed-card {
    animation: none;
  }
}
</style>
