import { Telegraf } from 'telegraf';
import { addKeyword, fetchKeywords } from './notion.js';

export function startBot() {
  const token = process.env.TG_BOT_TOKEN;
  if (!token) {
    console.warn('[Bot] TG_BOT_TOKEN 未設定，無法啟動對話機器人功能');
    return;
  }

  const bot = new Telegraf(token);

  bot.command('add', async (ctx) => {
    // 指令格式：/add 關鍵字 [分類]
    const text = ctx.message.text;
    const parts = text.split(/\s+/);
    
    if (parts.length < 2) {
      return ctx.reply('⚠️ 請輸入要新增的關鍵字。\n格式：`/add 關鍵字 [分類]`\n範例：`/add 台積電 股票`', { parse_mode: 'Markdown' });
    }

    const keyword = parts[1];
    const category = parts[2] || '其他';

    try {
      const success = await addKeyword(keyword, category);
      if (success) {
        ctx.reply(`✅ 成功新增關鍵字！\n名稱：${keyword}\n分類：${category}\n\n（下次新聞推送時就會包含此關鍵字）`);
      } else {
        ctx.reply('❌ 新增失敗，請檢查 Notion API 設定或權限。');
      }
    } catch (err) {
      console.error(err);
      ctx.reply('❌ 系統發生錯誤。');
    }
  });

  bot.command('listall', async (ctx) => {
    try {
      const keywords = await fetchKeywords();
      if (keywords.length === 0) {
        return ctx.reply('📭 目前沒有追蹤任何關鍵字。');
      }

      // 按分類分組
      const byCategory: Record<string, string[]> = {};
      for (const kw of keywords) {
        if (!byCategory[kw.category]) byCategory[kw.category] = [];
        byCategory[kw.category].push(kw.name);
      }

      let replyMsg = '📋 **目前追蹤中的關鍵字**\n\n';
      for (const [cat, items] of Object.entries(byCategory)) {
        replyMsg += `📁 **${cat}**\n`;
        replyMsg += items.map(item => `  • ${item}`).join('\n');
        replyMsg += '\n\n';
      }

      ctx.reply(replyMsg, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error(err);
      ctx.reply('❌ 取得關鍵字失敗，請檢查 Notion API。');
    }
  });

  bot.launch()
    .then(() => console.log('[Bot] 機器人對話監聽中...'))
    .catch((err) => console.error('[Bot] 啟動失敗:', err));

  // 確保優雅地停止
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
