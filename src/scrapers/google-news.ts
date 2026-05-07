/**
 * Google News RSS 爬蟲
 * 透過 Google News RSS 搜尋限定於鉅亨網和 MoneyDJ 的新聞
 */
import { withRetry } from '../retry.js';

export interface NewsArticle {
  guid: string;
  title: string;
  source: string;       // 'cnyes' | 'moneydj' | 'other'
  sourceName: string;    // 顯示名稱
  url: string;
  pubDate: string;
  keyword: string;
}

const GOOGLE_NEWS_RSS = 'https://news.google.com/rss/search';

/**
 * 解析 RSS XML，提取 <item> 內容
 * 不依賴 XML parser，用 regex 提取
 */
function parseRssItems(xml: string): Array<{
  title: string;
  link: string;
  guid: string;
  pubDate: string;
  source: string;
}> {
  const items: Array<{ title: string; link: string; guid: string; pubDate: string; source: string }> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    const title = content.match(/<title>(.*?)<\/title>/)?.[1] || '';
    const link = content.match(/<link>(.*?)<\/link>/)?.[1] || '';
    const guid = content.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1] || '';
    const pubDate = content.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
    const source = content.match(/<source[^>]*>(.*?)<\/source>/)?.[1] || '';

    if (title && link) {
      items.push({ title, link, guid, pubDate, source });
    }
  }

  return items;
}

/**
 * 判斷新聞來源
 */
function classifySource(sourceName: string): { source: string; displayName: string } {
  const lower = sourceName.toLowerCase();
  if (lower.includes('cnyes') || lower.includes('鉅亨')) return { source: 'cnyes', displayName: '鉅亨網' };
  if (lower.includes('moneydj') || lower.includes('理財網')) return { source: 'moneydj', displayName: 'MoneyDJ' };
  if (lower.includes('reuters') || lower.includes('路透')) return { source: 'reuters', displayName: 'Reuters' };
  if (lower.includes('bloomberg') || lower.includes('彭博')) return { source: 'bloomberg', displayName: 'Bloomberg' };
  if (lower.includes('cnbc')) return { source: 'cnbc', displayName: 'CNBC' };
  if (lower.includes('wsj') || lower.includes('華爾街日報') || lower.includes('wall street journal')) return { source: 'wsj', displayName: 'WSJ' };
  if (lower.includes('yahoo') || lower.includes('雅虎')) return { source: 'yahoo', displayName: 'Yahoo Finance' };
  if (lower.includes('ft') || lower.includes('financial times')) return { source: 'ft', displayName: 'Financial Times' };

  return { source: 'other', displayName: sourceName };
}

/**
 * 清理 Google News 的標題（移除來源後綴）
 */
function cleanTitle(rawTitle: string): string {
  // Google News 標題格式: "新聞標題 - 來源名稱"
  return rawTitle.replace(/\s*-\s*(news\.cnyes\.com|MoneyDJ理財網|鉅亨號)$/, '').trim();
}

/**
 * 搜尋指定關鍵字的新聞
 */
async function fetchRss(query: string, hl: string, gl: string, ceid: string, keyword: string, max: number): Promise<NewsArticle[]> {
  const params = new URLSearchParams({ q: query, hl, gl, ceid });
  const url = `${GOOGLE_NEWS_RSS}?${params.toString()}`;

  const xml = await withRetry(async () => {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`Google News RSS 錯誤: ${res.status}`);
    return res.text();
  }, `GoogleNews:${keyword}`);

  const items = parseRssItems(xml);
  const articles: NewsArticle[] = [];

  for (const item of items) {
    const { source, displayName } = classifySource(item.source);
    if (source === 'other') continue;

    articles.push({
      guid: item.guid || item.link,
      title: cleanTitle(item.title),
      source,
      sourceName: displayName,
      url: item.link,
      pubDate: item.pubDate,
      keyword,
    });
    if (articles.length >= max) break;
  }
  return articles;
}

export async function searchNews(keyword: string, keywordEn?: string, maxResults = 8): Promise<NewsArticle[]> {
  const articles: NewsArticle[] = [];

  // 1. 中文搜尋 (台灣媒體)
  const twQuery = `${keyword} site:cnyes.com OR site:moneydj.com`;
  articles.push(...await fetchRss(twQuery, 'zh-TW', 'TW', 'TW:zh-Hant', keyword, maxResults));

  // 2. 英文搜尋 (外國媒體)
  if (keywordEn) {
    const enQuery = `${keywordEn} site:reuters.com OR site:bloomberg.com OR site:cnbc.com OR site:wsj.com OR site:ft.com OR site:finance.yahoo.com`;
    articles.push(...await fetchRss(enQuery, 'en-US', 'US', 'US:en', keyword, maxResults));
  }

  return articles;
}
