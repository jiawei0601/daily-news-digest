/**
 * 爬蟲調度：整合各新聞來源
 */
import { searchNews, type NewsArticle } from './google-news.js';
import type { NotionKeyword } from '../notion.js';

export type { NewsArticle } from './google-news.js';

export interface KeywordNews {
  keyword: NotionKeyword;
  articles: NewsArticle[];
}

/**
 * 為每個關鍵字搜尋新聞
 * @param keywords Notion 關鍵字清單
 * @param maxPerKeyword 每個關鍵字最多抓取幾則
 * @returns 按關鍵字分組的新聞
 */
export async function fetchAllNews(
  keywords: NotionKeyword[],
  maxPerKeyword = 8,
): Promise<KeywordNews[]> {
  const results: KeywordNews[] = [];

  for (const kw of keywords) {
    try {
      console.log(`[Scraper] 搜尋: ${kw.name} (${kw.category})`);
      const articles = await searchNews(kw.name, maxPerKeyword);
      results.push({ keyword: kw, articles });
      console.log(`[Scraper]   → ${articles.length} 篇`);

      // 禮貌延遲，避免被 Google 限速
      await new Promise((r) => setTimeout(r, 1500));
    } catch (err) {
      console.error(`[Scraper] ${kw.name} 搜尋失敗:`, err);
      results.push({ keyword: kw, articles: [] });
    }
  }

  return results;
}
