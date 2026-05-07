/**
 * 每日財經新聞速報 — 主入口
 *
 * 流程: Notion 讀取關鍵字 → Google News RSS 搜尋 → 去重 → LLM 統整 → Telegram 推送
 * 排程: 每 3 小時一次 (06:00, 09:00, 12:00, 15:00, 18:00, 21:00)
 */
import cron from 'node-cron';
import { fetchKeywords } from './notion.js';
import { fetchAllNews, type KeywordNews, type NewsArticle } from './scrapers/index.js';
import { analyzeNews } from './analyze.js';
import { formatReport, sendTelegram } from './telegram.js';
import { getDb } from './db.js';

const isCron = process.argv.includes('--cron');
let running = false;

/**
 * 過濾已見過的新聞（去重）
 */
function filterNewArticles(newsData: KeywordNews[]): { filtered: KeywordNews[]; newCount: number } {
  const db = getDb();
  const checkStmt = db.prepare('SELECT 1 FROM articles WHERE guid = ?');
  const insertStmt = db.prepare(
    'INSERT OR IGNORE INTO articles (guid, keyword, title, source, url, pub_date) VALUES (?, ?, ?, ?, ?, ?)',
  );

  let newCount = 0;
  const filtered: KeywordNews[] = [];

  const insertMany = (articles: NewsArticle[]) => {
    db.exec('BEGIN IMMEDIATE');
    try {
      for (const a of articles) {
        insertStmt.run(a.guid, a.keyword, a.title, a.source, a.url, a.pubDate);
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  };

  for (const kn of newsData) {
    const newArticles = kn.articles.filter((a) => !checkStmt.get(a.guid));
    if (newArticles.length > 0) {
      insertMany(newArticles);
      newCount += newArticles.length;
    }
    filtered.push({ keyword: kn.keyword, articles: newArticles });
  }

  return { filtered, newCount };
}

/**
 * 主執行流程
 */
async function run(): Promise<void> {
  if (running) {
    console.log('[Run] 上一次執行尚未完成，跳過');
    return;
  }
  running = true;

  try {
    console.log('\n========================================');
    console.log(`[Run] 開始執行 — ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`);

    // 1. 從 Notion 讀取關鍵字
    const keywords = await fetchKeywords();
    if (keywords.length === 0) {
      console.log('[Run] 沒有啟用的關鍵字，結束');
      return;
    }

    // 2. 搜尋新聞
    const allNews = await fetchAllNews(keywords);

    // 3. 去重
    const { filtered, newCount } = filterNewArticles(allNews);
    const hasNewArticles = filtered.some((kn) => kn.articles.length > 0);

    if (!hasNewArticles) {
      console.log('[Run] 沒有新的新聞，跳過推送');
      return;
    }

    console.log(`[Run] 新增 ${newCount} 篇新聞`);

    // 4. LLM 統整分析（使用所有新聞，包含舊的，提供更好的上下文）
    const analysis = await analyzeNews(allNews);

    // 5. 產生報告並推送 Telegram
    const report = formatReport(filtered, analysis, newCount);
    await sendTelegram(report);

    // 6. 記錄
    const db = getDb();
    db.prepare('INSERT INTO reports (keyword_count, article_count, summary) VALUES (?, ?, ?)')
      .run(keywords.length, newCount, analysis.summary?.slice(0, 500) || '');

    console.log('[Run] 完成');
  } catch (err) {
    console.error('[Run] 執行失敗:', err);
  } finally {
    running = false;
  }
}

// ── 啟動 ──────────────────────────────────────────────

if (isCron) {
  console.log('🗞️  每日財經新聞速報 v1.0.0 — 排程模式');
  console.log('   排程: 每 3 小時 (06:00, 09:00, 12:00, 15:00, 18:00, 21:00)');
  console.log('   Notion / Google News RSS / Gemini 3.0 Flash / Telegram');
  console.log('');

  // 每 3 小時執行一次 (06, 09, 12, 15, 18, 21)
  cron.schedule('0 6,9,12,15,18,21 * * *', () => {
    console.log(`[Cron] 觸發排程 — ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`);
    run();
  }, { timezone: 'Asia/Taipei' });

  // 啟動時立即執行一次
  console.log('[Cron] 啟動後立即執行一次...');
  run();
} else {
  // 單次模式
  run().then(() => process.exit(0)).catch(() => process.exit(1));
}
