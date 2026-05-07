/**
 * Telegram 通知推送
 */
import type { KeywordNews } from './scrapers/index.js';
import type { AnalysisResult } from './analyze.js';
import { withRetry } from './retry.js';

const TG_API = 'https://api.telegram.org';
const MAX_LEN = 4096;

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * 產生 Telegram HTML 格式報告
 */
export function formatReport(
  newsData: KeywordNews[],
  analysis: AnalysisResult,
  newArticleCount: number,
): string {
  const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  const lines: string[] = [];

  lines.push(`📰 <b>財經新聞速報</b>`);
  lines.push(`🕐 ${escapeHtml(now)}`);
  lines.push('');

  // 按關鍵字列出新聞
  for (const kn of newsData) {
    if (kn.articles.length === 0) continue;

    lines.push(`━━━━━━━━━━━━━━━`);
    lines.push(`🔍 <b>${escapeHtml(kn.keyword.name)}</b>（${kn.articles.length} 篇）`);

    for (const article of kn.articles.slice(0, 5)) {
      const title = escapeHtml(article.title.slice(0, 60));
      lines.push(`• ${title} [${escapeHtml(article.sourceName)}]`);
    }
    if (kn.articles.length > 5) {
      lines.push(`  ...還有 ${kn.articles.length - 5} 篇`);
    }
    lines.push('');
  }

  // AI 統整
  if (analysis.success && analysis.summary) {
    lines.push(`━━━━━━━━━━━━━━━`);
    lines.push(`📊 <b>統整分析</b>`);
    lines.push(escapeHtml(analysis.summary));
    lines.push('');
  }

  lines.push(`📊 本次新增 ${newArticleCount} 篇新聞`);
  lines.push(`⚠️ <i>僅供參考，不構成投資建議</i>`);

  return lines.join('\n');
}

/**
 * 分割長訊息
 */
function splitMessage(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    let splitIdx = remaining.lastIndexOf('\n', maxLen);
    if (splitIdx <= 0) splitIdx = remaining.lastIndexOf(' ', maxLen);
    if (splitIdx <= 0) splitIdx = maxLen;

    chunks.push(remaining.slice(0, splitIdx));
    remaining = remaining.slice(splitIdx).replace(/^\n/, '');
  }
  return chunks;
}

/**
 * 發送 Telegram 訊息
 */
export async function sendTelegram(text: string): Promise<void> {
  const botToken = process.env.TG_BOT_TOKEN;
  const channelId = process.env.TG_CHANNEL_ID;

  if (!botToken || !channelId) {
    console.warn('[TG] TG_BOT_TOKEN 或 TG_CHANNEL_ID 未設定，跳過推送');
    return;
  }

  const chunks = splitMessage(text, MAX_LEN);

  for (const chunk of chunks) {
    await withRetry(async () => {
      const res = await fetch(`${TG_API}/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: channelId,
          text: chunk,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Telegram 發送失敗: ${res.status} ${body.slice(0, 200)}`);
      }
    }, 'Telegram');
  }

  console.log(`[TG] 報告已推送至 ${channelId}`);
}
