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
  if (lower.includes('cnyes') || lower.includes('鉅亨')) {
    return { source: 'cnyes', displayName: '鉅亨網' };
  }
  if (lower.includes('moneydj') || lower.includes('理財網')) {
    return { source: 'moneydj', displayName: 'MoneyDJ' };
  }
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
export async function searchNews(keyword: string, maxResults = 10): Promise<NewsArticle[]> {
  const query = `${keyword} site:cnyes.com OR site:moneydj.com`;
  const params = new URLSearchParams({
    q: query,
    hl: 'zh-TW',
    gl: 'TW',
    ceid: 'TW:zh-Hant',
  });

  const url = `${GOOGLE_NEWS_RSS}?${params.toString()}`;

  const xml = await withRetry(async () => {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsDigest/1.0)',
      },
    });
    if (!res.ok) {
      throw new Error(`Google News RSS 錯誤: ${res.status}`);
    }
    return res.text();
  }, `GoogleNews:${keyword}`);

  const items = parseRssItems(xml);
  const articles: NewsArticle[] = [];

  for (const item of items.slice(0, maxResults)) {
    const { source, displayName } = classifySource(item.source);
    // 只保留鉅亨網和 MoneyDJ 的新聞
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
  }

  return articles;
}
