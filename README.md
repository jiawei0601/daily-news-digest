# 每日財經新聞速報 (Daily News Digest)

自動追蹤 Notion 清單中的關鍵字，從鉅亨網/MoneyDJ 搜尋相關新聞，透過 AI 統整分析後推送至 Telegram。

## 功能

- 🔍 **Notion 關鍵字管理** — 在 Notion Database 中新增/啟用/停用追蹤關鍵字
- 📰 **雙源新聞搜尋** — 透過 Google News RSS 精準搜尋鉅亨網和 MoneyDJ 的新聞
- 🤖 **AI 統整分析** — Gemini 3.0 Flash 統整多個關鍵字的新聞趨勢
- 📱 **Telegram 推送** — HTML 格式的專業報告，每 3 小時自動推送
- 🔁 **智慧去重** — SQLite 記錄已推送過的新聞，避免重複通知

## 架構

```
Notion Database → 關鍵字清單
        ↓
Google News RSS → 搜尋鉅亨網 + MoneyDJ
        ↓
SQLite 去重 → 過濾已推送
        ↓
Gemini 3.0 Flash → 統整分析
        ↓
Telegram → 推送報告
```

## 排程

| 時間 | 說明 |
|------|------|
| 06:00, 09:00, 12:00, 15:00, 18:00, 21:00 | 每 3 小時自動執行 |

## 設定

### 1. Notion Database

在 Notion 建立一個 Database，欄位如下：

| 欄位 | 類型 | 說明 |
|------|------|------|
| 名稱 | Title | 關鍵字 |
| 分類 | Select | 股票/產業/總經/其他 |
| 啟用 | Checkbox | 是否追蹤 |

建立後需將 Integration 連接至該 Database。

### 2. 環境變數

```env
# Notion
NOTION_TOKEN=ntn_xxx
NOTION_DATABASE_ID=xxx

# LLM
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
LLM_API_KEY=your_key
LLM_MODEL=gemini-3.0-flash

# Telegram
TG_BOT_TOKEN=your_bot_token
TG_CHANNEL_ID=your_channel_id
```

### 3. 安裝與執行

```bash
npm install

# 單次執行
npm run once

# 排程模式
npm run dev
```

## 授權

AGPL-3.0
