<template>
  <section class="page-heading">
    <div>
      <p class="eyebrow">Diary JSON Demo</p>
      <h1>日记列表</h1>
    </div>
    <a-button type="primary" @click="router.push('/admin')">写一篇</a-button>
  </section>

  <div class="diary-grid">
    <RouterLink v-for="diary in diaries" :key="diary.id" class="diary-card" :to="`/diary/${diary.id}`">
      <div class="card-meta">
        <span>updated : {{ formatTimestamp(diary.updatedAt || diary.createdAt, diary.date) }}</span>
        <a-tag :color="moodColor[diary.mood]">{{ moodLabel[diary.mood] }}</a-tag>
      </div>
      <h2>{{ diary.title }}</h2>
      <div class="preview" v-html="renderDiaryHtml(diary.content)" />
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router';
import dayjs from 'dayjs';
import { sampleDiaries } from '../data/sampleDiaries';
import { renderDiaryHtml } from '../utils/tiptap';
import type { Mood } from '../types';

const router = useRouter();
const diaries = sampleDiaries;

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
