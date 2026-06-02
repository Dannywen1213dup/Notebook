import type { DiaryEntry } from '../types';

export const sampleDiaries: DiaryEntry[] = [
  {
    id: '2026-06-02-001',
    title: '今天学算法',
    date: '2026-06-02',
    createdAt: '2026-06-02T09:30:00+08:00',
    updatedAt: '2026-06-02T10:15:00+08:00',
    mood: 'normal',
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '今天学了快排，也把日记站的基础结构搭起来了。' }],
        },
      ],
    },
  },
  {
    id: '2026-06-01-001',
    title: '做一个轻量记录页',
    date: '2026-06-01',
    createdAt: '2026-06-01T21:10:00+08:00',
    updatedAt: '2026-06-01T21:40:00+08:00',
    mood: 'happy',
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '先让页面能读 JSON，再把写入交给 GitHub API。' }],
        },
      ],
    },
  },
];
