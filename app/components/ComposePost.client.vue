<script setup lang="ts">
const emit = defineEmits<{ 'post-created': [] }>();

const client = useTrellis();
const ME_ID = 'person:you';
const ME_NAME = 'You';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const content = ref('');
const tagInput = ref('');
const tags = ref<string[]>([]);
const submitting = ref(false);
const error = ref<string | null>(null);

// Image state
const fileInput = useTemplateRef<HTMLInputElement>('file-input');
const selectedFile = ref<File | null>(null);
const imagePreview = ref<string | null>(null);

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  if (file.size > MAX_FILE_SIZE) {
    error.value = `Image must be under ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)} MB`;
    input.value = '';
    return;
  }

  if (!file.type.startsWith('image/')) {
    error.value = 'Only image files are supported';
    input.value = '';
    return;
  }

  selectedFile.value = file;
  error.value = null;

  const reader = new FileReader();
  reader.onload = () => { imagePreview.value = reader.result as string; };
  reader.readAsDataURL(file);
}

function removeImage() {
  selectedFile.value = null;
  imagePreview.value = null;
  if (fileInput.value) fileInput.value.value = '';
}

function addTag() {
  const label = tagInput.value.trim().toLowerCase().replace(/\s+/g, '-');
  if (label && !tags.value.includes(label)) {
    tags.value.push(label);
  }
  tagInput.value = '';
}

function removeTag(label: string) {
  tags.value = tags.value.filter((t) => t !== label);
}

function onTagKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault();
    addTag();
  }
}

/** Create if missing — uses SDK (Bearer) so probe 404s stay out of the console. */
async function ensureEntity(
  type: string,
  id: string,
  attributes: Record<string, unknown>,
) {
  const existing = await client.read(id);
  if (existing) return;
  await client.create(type, attributes, undefined, { id });
}

async function submit() {
  if (!content.value.trim()) return;
  submitting.value = true;
  error.value = null;

  try {
    await ensureEntity('Person', ME_ID, { name: ME_NAME, bio: '' });

    const tagIds: string[] = [];
    for (const label of tags.value) {
      const tagId = `tag:${label}`;
      tagIds.push(tagId);
      await ensureEntity('Tag', tagId, { label });
    }

    // Upload image if selected (requires apiKey when `.trellis-db.json` has one)
    let imageUrl: string | undefined;
    if (selectedFile.value) {
      const buffer = await selectedFile.value.arrayBuffer();
      const result = await client.upload(
        new Uint8Array(buffer),
        selectedFile.value.type,
      );
      imageUrl = result.hash;
    }

    const postId = `post:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    await client.create(
      'Post',
      {
        content: content.value.trim(),
        published: true,
        likes: 0,
        reposts: 0,
        author: ME_ID,
        tags: tagIds,
        ...(imageUrl ? { imageUrl } : {}),
      },
      undefined,
      { id: postId },
    );

    content.value = '';
    tags.value = [];
    removeImage();
    emit('post-created');
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="rounded-xl border border-border/50 bg-card/75 p-5 shadow-sm backdrop-blur-[2px]">
    <form @submit.prevent="submit" class="space-y-4">
      <!-- Content -->
      <div>
        <textarea v-model="content" placeholder="What's on your mind?" required rows="3"
          class="w-full resize-none rounded-lg border border-border/50 bg-muted/40 px-4 py-3 text-[0.95rem] leading-relaxed text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-brass/50 focus:ring-1 focus:ring-brass/20" />
      </div>

      <!-- Image Preview -->
      <div v-if="imagePreview" class="relative">
        <img :src="imagePreview" alt="Selected image"
          class="w-full max-h-64 rounded-lg object-cover ring-1 ring-border/30" />
        <button type="button" @click="removeImage"
          class="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
          aria-label="Remove image">
          <Icon name="lucide:x" class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Tags -->
      <div>
        <div v-if="tags.length" class="mb-2 flex flex-wrap gap-1.5">
          <span v-for="tag in tags" :key="tag"
            class="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] tracking-wide text-muted-foreground">
            {{ tag }}
            <button type="button" @click="removeTag(tag)"
              class="ml-0.5 rounded-full hover:text-foreground transition-colors" aria-label="Remove tag">
              <Icon name="lucide:x" class="w-3 h-3" />
            </button>
          </span>
        </div>
        <input v-model="tagInput" type="text" placeholder="Add a tag (press Enter)" @keydown="onTagKeydown"
          class="w-full rounded-lg border border-border/50 bg-muted/40 px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-brass/50 focus:ring-1 focus:ring-brass/20" />
      </div>

      <!-- Error -->
      <p v-if="error" class="text-xs text-destructive">{{ error }}</p>

      <!-- Actions -->
      <div class="flex items-center justify-between">
        <!-- Attach image -->
        <button type="button" @click="fileInput?.click()"
          class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
          <Icon name="lucide:image" class="w-4 h-4" />
          <span class="hidden sm:inline">Image</span>
        </button>

        <input ref="file-input" type="file" accept="image/*" class="hidden" @change="onFileChange" />

        <!-- Submit -->
        <button type="submit" :disabled="submitting || !content.trim()"
          class="rounded-lg bg-brass/90 px-5 py-2 text-sm font-medium text-background transition-all hover:bg-brass disabled:opacity-40 disabled:cursor-not-allowed">
          {{ submitting ? 'Posting…' : 'Post' }}
        </button>
      </div>
    </form>
  </div>
</template>
