import { Telegraf } from 'telegraf';
import { addKeyword, fetchKeywords, removeKeyword } from './notion.js';

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

  bot.command('remove', async (ctx) => {
    const text = ctx.message.text;
    const parts = text.split(/\s+/);
    
    if (parts.length < 2) {
      return ctx.reply('⚠️ 請輸入要移除的關鍵字。\n格式：`/remove 關鍵字`\n範例：`/remove 台積電`', { parse_mode: 'Markdown' });
    }

    const keyword = parts.slice(1).join(' ');

    try {
      const result = await removeKeyword(keyword);
      if (result === 'NOT_FOUND') {
        ctx.reply(`⚠️ 找不到關鍵字「${keyword}」，請先使用 /listall 確認。`);
      } else if (result) {
        ctx.reply(`🗑️ 已成功停止追蹤關鍵字：${keyword}`);
      } else {
        ctx.reply('❌ 移除失敗，請檢查 Notion API。');
      }
    } catch (err) {
      console.error(err);
      ctx.reply('❌ 系統發生錯誤。');
    }
  });

  bot.command('apicheck', async (ctx) => {
    // 檢查 API 金鑰是否設定
    const geminiKey = !!process.env.LLM_API_KEY;
    const notionKey = !!process.env.NOTION_TOKEN;

    let msg = '📊 **API 狀態檢查**\n\n';
    msg += `Notion API: ${notionKey ? '✅ 已設定' : '❌ 未設定'}\n`;
    msg += `Gemini API: ${geminiKey ? '✅ 已設定' : '❌ 未設定'}\n\n`;

    msg += 'ℹ️ **Gemini 額度說明 (免費版)**\n';
    msg += '• 每分鐘請求數: 15 RPM\n';
    msg += '• 每天請求數: 1,500 RPD\n';
    msg += '• 每分鐘 Token 數: 1,000,000 TPM\n\n';
    msg += '*(註：Google 官方未提供查詢剩餘額度的 API 接口，請參考上述上限)*';

    ctx.reply(msg, { parse_mode: 'Markdown' });
  });

  bot.command('help', (ctx) => {
    const helpMsg = `
🤖 **每日財經新聞速報機器人 指令列表**

🔹 \`/add 關鍵字 [分類]\`
新增要追蹤的關鍵字 (例如：\`/add 蘋果 股票\`)

🔹 \`/remove 關鍵字\`
停止追蹤某個關鍵字 (例如：\`/remove 蘋果\`)

🔹 \`/listall\`
列出目前所有追蹤中的關鍵字與分類

🔹 \`/apicheck\`
查看系統 API 狀態與連線額度說明

🔹 \`/help\`
顯示此說明訊息
    `;
    ctx.reply(helpMsg.trim(), { parse_mode: 'Markdown' });
  });

  // 處理未知指令
  bot.on('text', (ctx, next) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) {
      const cmd = text.split(' ')[0];
      if (!['/add', '/remove', '/listall', '/apicheck', '/help'].includes(cmd)) {
        ctx.reply('❌ 未知的指令。請輸入 /help 查看所有可用指令。');
      } else {
        return next();
      }
    } else {
      return next();
    }
  });

  bot.launch()
    .then(() => console.log('[Bot] 機器人對話監聽中...'))
    .catch((err) => console.error('[Bot] 啟動失敗:', err));

  // 確保優雅地停止
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
