/**
 * LLM 新聞統整分析
 * 使用 Gemini 3.0 Flash 統整多個關鍵字的新聞
 */
import OpenAI from 'openai';
import type { KeywordNews } from './scrapers/index.js';
import { withRetry } from './retry.js';

const SYSTEM_PROMPT = `你是專業的台灣財經新聞分析師。

你的任務是根據以下多個關鍵字的相關新聞，撰寫一份簡潔有力的統整分析報告。

要求：
1. 為每個關鍵字用 1-2 句話總結最重要的動態
2. 找出不同關鍵字間的關聯性和共同趨勢
3. 最後給出「市場觀察」，指出投資人值得注意的重點
4. 語氣專業但易懂，適合非專業投資人閱讀
5. 使用繁體中文
6. 控制在 500 字以內

輸出格式：
【各標的動態】
• 關鍵字A：摘要...
• 關鍵字B：摘要...

【趨勢觀察】
整體趨勢分析...

【投資人注意】
• 重點一
• 重點二

⚠️ 僅供參考，不構成投資建議`;

export interface AnalysisResult {
  summary: string;
  success: boolean;
}

export async function analyzeNews(
  newsData: KeywordNews[],
): Promise<AnalysisResult> {
  const baseUrl = process.env.LLM_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai';
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || 'gemini-3.0-flash';

  if (!apiKey) {
    return { summary: '（LLM API Key 未設定，無法進行分析）', success: false };
  }

  // 組合新聞資料為 prompt
  const newsContent = newsData
    .filter((kn) => kn.articles.length > 0)
    .map((kn) => {
      const articleList = kn.articles
        .map((a) => `  - ${a.title} [${a.sourceName}] (${new Date(a.pubDate).toLocaleDateString('zh-TW')})`)
        .join('\n');
      return `【${kn.keyword.name}】(${kn.keyword.category})\n${articleList}`;
    })
    .join('\n\n');

  if (!newsContent) {
    return { summary: '本次未抓取到任何新聞。', success: true };
  }

  const client = new OpenAI({ baseURL: baseUrl, apiKey });

  const result = await withRetry(async () => {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.3,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `以下是各關鍵字的最新新聞，請統整分析：\n\n${newsContent}` },
      ],
    });
    return completion.choices[0]?.message?.content || '';
  }, 'LLM分析');

  return { summary: result, success: true };
}
