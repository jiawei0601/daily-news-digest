/**
 * SQLite 資料庫管理
 * - articles: 已抓取的新聞文章（用於去重）
 * - reports: 報告歷史紀錄
 */
// @ts-ignore
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'news-digest.db');

let db: any;

export function getDb(): any {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL;');
    migrate(db);
  }
  return db;
}

function migrate(db: any): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guid TEXT UNIQUE NOT NULL,
      keyword TEXT NOT NULL,
      title TEXT NOT NULL,
      source TEXT NOT NULL,
      url TEXT NOT NULL,
      pub_date TEXT,
      fetched_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword_count INTEGER,
      article_count INTEGER,
      summary TEXT,
      sent_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_articles_keyword ON articles(keyword);
    CREATE INDEX IF NOT EXISTS idx_articles_fetched ON articles(fetched_at);
  `);
}
