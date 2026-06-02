<template>
  <a-button class="back-button" @click="router.push('/')">返回列表</a-button>

  <article v-if="diary" class="diary-detail">
    <div class="detail-meta">
      <span>{{ diary.date }}</span>
      <a-tag :color="moodColor[diary.mood]">{{ moodLabel[diary.mood] }}</a-tag>
    </div>
    <div class="detail-time">
      <span>created : {{ formatTimestamp(diary.createdAt, diary.date) }}</span>
      <span>updated : {{ formatTimestamp(diary.updatedAt || diary.createdAt, diary.date) }}</span>
    </div>
    <h1>{{ diary.title }}</h1>
    <div class="reader-content" v-html="renderDiaryHtml(diary.content)" />
    <a-divider />
    <a-typography-title :level="4">JSON</a-typography-title>
    <pre class="json-preview">{{ JSON.stringify(diary, null, 2) }}</pre>
  </article>

  <a-result v-else status="404" title="没找到这篇日记" sub-title="这个 demo 现在读取的是内置示例数据。" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import dayjs from 'dayjs';
import { useRoute, useRouter } from 'vue-router';
import { sampleDiaries } from '../data/sampleDiaries';
import { renderDiaryHtml } from '../utils/tiptap';
import type { Mood } from '../types';

const route = useRoute();
const router = useRouter();

const diary = computed(() => sampleDiaries.find((item) => item.id === route.params.id));

const moodLabel: Record<Mood, string> = {
  happy: '开心',
  normal: '普通',
  tired: '疲惫',
  sad: '低落',
};

const moodColor: Record<Mood, string> = {
  happy: 'gold',
  normal: 'blue',
  tired: 'purple',
  sad: 'default',
};

function defaultTimestampForDate(dateStr: string) {
  const d = dayjs(dateStr);
  if (!d.isValid()) return '';
  return d.hour(9).minute(0).second(0).millisecond(0).toISOString();
}

function formatTimestamp(timestamp?: string, fallbackDate?: string) {
  const source = timestamp || (fallbackDate ? defaultTimestampForDate(fallbackDate) : '');
  if (!source) return '';
  const d = dayjs(source);
  if (!d.isValid()) return '';
  return d.format('YYYY.MM.DD HH:mm');
}
</script>
