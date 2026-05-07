# 每日財經新聞速報 (Daily News Digest)

這是一個自動化的新聞追蹤與統整機器人。它可以自動追蹤你在 Notion 清單中指定的「關鍵字」，定時從台灣（鉅亨網、MoneyDJ）與國外權威財經媒體（Reuters、Bloomberg、CNBC 等）搜尋最新新聞，接著交由 AI (Gemini) 進行重點統整，最後自動推送到你的 Telegram 頻道。

## ✨ 核心功能

- 🔍 **Notion 關鍵字管理** — 隨時在 Notion Database 中新增/停用你要追蹤的關鍵字（如：台積電、輝達）。
- 📰 **中外新聞全網搜** — 自動將中文關鍵字翻譯為英文，跨語言搜尋國內外權威媒體。
- 🤖 **AI 智慧統整** — 透過 Gemini 2.5 Flash 去蕪存菁，只提煉最精華的最新動態與市場觀察。
- 📱 **Telegram 自動推播** — 以 HTML 格式產生精美的專業報告，依指定排程（預設：08:00, 16:00, 22:00）自動推送。
- 🔁 **智慧去重機制** — 內建 SQLite 記錄已推播過的新聞，確保 AI 只針對「最新」的新聞進行分析，不會重複疲勞轟炸。

---

## 💬 機器人互動指令

只要與機器人私訊（或是將機器人加入群組並設定好），即可使用以下指令隨時管理你的新聞追蹤名單：

| 指令 | 說明 | 範例 |
|------|------|------|
| `/add <關鍵字> [分類]` | 新增追蹤關鍵字並同步至 Notion | `/add 蘋果 股票` |
| `/remove <關鍵字>` | 停止追蹤某關鍵字 (於 Notion 中標記為停止追蹤) | `/remove 蘋果` |
| `/listall` | 查詢目前所有追蹤中的關鍵字與分類清單 | `/listall` |
| `/apicheck` | 檢查系統 API 連線狀態並查看額度說明 | `/apicheck` |
| `/help` | 顯示指令教學列表 | `/help` |

---

## 🚀 從零開始佈署教學

想把這個專案架設到你自己的環境嗎？請按照以下步驟進行設定：

### 第一步：取得各式 API Key 與 Token

你需要申請以下三個服務的免費 Token：

#### 1. Notion API & Database
1. 進入 [Notion My Integrations](https://www.notion.so/my-integrations)，點擊「New integration」建立一個新的整合，並複製 **Internal Integration Secret** (這就是 `NOTION_TOKEN`)。
2. 在你的 Notion 中建立一個 Database (資料庫) 作為關鍵字清單，欄位設定如下：
   - `名稱` (Title): 關鍵字，例如「台積電」
   - `分類` (Select): 例如「股票」、「產業」、「總經」
   - `狀態` (Status): 選項必須包含「進行中」。機器人只會抓取狀態為「進行中」的關鍵字。
3. 取得 **Database ID**：打開這個 Database 的網頁，網址中 `notion.so/` 後面到 `?v=` 之間的那一串 32 個字元的代碼就是 `NOTION_DATABASE_ID`。
4. **重要**：在你的 Database 頁面右上角點擊「...」>「Connect to」> 選擇你剛剛建立的 Integration，這樣機器人才有權限讀取。

#### 2. Gemini API (Google AI Studio)
1. 前往 [Google AI Studio](https://aistudio.google.com/app/apikey)。
2. 點擊「Create API key」，取得一把免費的 API Key (這就是 `LLM_API_KEY`)。

#### 3. Telegram Bot & Channel
1. 在 Telegram 搜尋 `@BotFather`，輸入 `/newbot` 建立一個新的機器人，並取得 **Bot Token** (這就是 `TG_BOT_TOKEN`)。
2. 建立一個你用來接收新聞的 Telegram 頻道 (Channel) 或群組 (Group)。
3. 把你剛剛建立的機器人加入該頻道，並**設定為管理員 (Admin)**。
4. 隨便在頻道裡發送一條訊息，然後在瀏覽器前往 `https://api.telegram.org/bot<你的TG_BOT_TOKEN>/getUpdates`，在回傳的 JSON 尋找 `chat: { id: -100xxxxxxxx }`，這個數字就是你的 `TG_CHANNEL_ID`。

---

### 第二步：本機測試與執行

如果你想在自己的電腦上運行這個專案：

1. **安裝 Node.js**  
   請確保你的電腦安裝了 Node.js (推薦版本 v22.5.0 以上，因為需要支援原生 `node:sqlite`)。

2. **複製專案與安裝套件**
   ```bash
   git clone <這個專案的GitHub網址>
   cd daily-news-digest
   npm install
   ```

3. **設定環境變數**  
   複製範例設定檔並填入剛剛取得的各項 Key：
   ```bash
   cp .env.example .env
   ```
   打開 `.env` 填妥所有資訊。

4. **啟動測試**
   ```bash
   # 單次執行（馬上抓新聞並推播）
   npm run once

   # 排程模式（掛在背景，每天 08:00, 16:00, 22:00 自動執行）
   npm run dev
   ```

---

### 第三步：部署至雲端 (以 Railway 為例)

如果你希望機器人 24 小時在雲端自動運作，非常推薦使用 [Railway](https://railway.app/)：

1. **連結 GitHub**
   - 將這個專案上傳到你自己的 GitHub 儲存庫。
   - 登入 Railway，點擊右上角「**New Project**」 ➔ 選擇「**Deploy from GitHub repo**」➔ 選擇你的專案。

2. **設定環境變數 (Variables)**
   - 進入 Railway 專案設定，切換到「**Variables**」頁籤。
   - 點擊「Raw Editor」，直接把你 `.env` 裡面的所有內容貼上去並儲存。

3. **設定資料庫持久化 (Volumes)** ⚠️ 非常重要
   - 為了避免 Railway 每次更新時清空已發送過的新聞紀錄，請切換到「**Volumes**」頁籤。
   - 點擊「**New Volume**」。
   - 將 **Mount Path** 設定為：`/app/data`
   - 儲存設定。

4. **完成部署**
   設定完成後，Railway 會自動重新建置並運行專案。只要看到綠色的 `Success` 燈號，你的 AI 新聞秘書就已經正式上線啦！

---

## 📄 授權

本專案採用 AGPL-3.0 授權條款。

