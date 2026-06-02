import { generateHTML } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import type { JSONContent } from '@tiptap/vue-3';

export const renderDiaryHtml = (content: JSONContent) => generateHTML(content, [StarterKit]);
