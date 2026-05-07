/**
 * Notion API 客戶端
 * 讀取 Notion Database 中的關鍵字清單
 */
import { withRetry } from './retry.js';

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

export interface NotionKeyword {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
}

export async function fetchKeywords(): Promise<NotionKeyword[]> {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!token || !databaseId) {
    throw new Error('NOTION_TOKEN 或 NOTION_DATABASE_ID 未設定');
  }

  const results = await withRetry(async () => {
    const res = await fetch(`${NOTION_API}/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: {
          property: '狀態',
          status: { equals: '進行中' },
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Notion API 錯誤: ${res.status} ${body.slice(0, 200)}`);
    }

    return res.json();
  }, 'Notion');

  const keywords: NotionKeyword[] = [];

  for (const page of (results as any).results) {
    const props = page.properties;

    // 標題欄位（名稱）
    const nameProp = props['名稱'];
    const name = nameProp?.title?.[0]?.plain_text || '';
    if (!name) continue;

    // 分類（Select）
    const categoryProp = props['分類'];
    const category = categoryProp?.select?.name || '其他';

    // 啟用（Checkbox）- 已在 filter 過濾
    keywords.push({
      id: page.id,
      name,
      category,
      enabled: true,
    });
  }

  console.log(`[Notion] 取得 ${keywords.length} 個關鍵字: ${keywords.map(k => k.name).join(', ')}`);
  return keywords;
}
