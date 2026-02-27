# 📋 看板管理系統 (Kanban Management System)

這是一個專為企業生產部門與多階層組織所設計的現代化 Kanban (看板) 管理應用程式。本系統不僅提供了直覺的拖曳式卡片管理，更針對「部門層級可見度」、「異常跨部門通報」與「全域公告」實作了精密的權限與資料隔離架構。

![App Screenshot](./public/icons/icon-512x512.png) <!-- 可以替換為您的實際系統截圖 -->

---

## ✨ 核心功能特色 (Key Features)

### 1. 🏢 多階層部門架構與資料隔離
- **父子部門關聯**：支援多層級組織架構 (例如：`總經理室` -> `生產部` -> `塑膠成型課(一廠)` )。
- **自動資料聚合**：上層主管登入時，可以選擇進入特定子部門的看板，或是進入「總覽看板」，一次查看所有轄下部門的工作狀況與列表。
- **嚴格資料隔離**：平行部門 (Siblings) 之間的卡片與列表資料相互隔離，彼此無法窺探機密業務。

### 2. 🚨 跨層級異常通報機制
- 針對生產線突發狀況或跨部門協作設計的獨特功能。
- 當基層部門向總部 (或上層) 建立「異常通報卡片」時，該卡片會直接並即時出現於上層管理者的共用看板列表中。
- **機密性保障**：即便該卡片存在於共用列表 (Shared/Global List) 中，系統也會透過 API 層自動過濾，確保**只有「發送方 (基層)」與「接收方 (上層)」能看見該卡片**，其他平行的子部門雖然也訂閱了該列表，但也無法看見其他人的通報內容。

### 3. 📣 全域公告與看板共用
- 管理員可於任意部門建立「共同訊息佈告欄 (Global List)」。
- 該列表會自動同步顯示於所有部門的看板中，方便管理者統一發布全廠區或全部門的政策與重要公告。

### 4. 🔐 角色權限管理 (RBAC 與 RLS)
- 結合 Supabase Row Level Security (RLS) 與伺服器行為 (Server Actions) 確保最高資訊安全。
- 只有被授權的管理員 (`is_admin`) 或部門主管 (`is_department_admin`) 能執行刪除卡片、建立共通佈告欄、與編輯系統設定。
- 支援「動態操作手冊」編輯，管理員可於後台直接以 Rich Text 編輯全站操作說明。

### 5. 📱 PWA (漸進式網路應用) 支援
- 專為現場作業員設計，支援安裝至平板或手機主畫面，提供離線快取與接近原生 App 的全螢幕沈浸體驗。

---

## 🛠 新增功能亮點：動態操作說明 (In-App Guide)

為了降低組織導入的教學成本，本系統內建動態操作手冊：
1. **後台編輯**：擁有系統管理員權限者，可進入「系統設定」頁面，使用 Rich Text Editor 撰寫並圖文並茂地排版操作說明。
2. **前台即時更新**：所有員工只需點選系統右上角的「📘 操作說明」，即可檢視最新版本的手冊，免除發佈 PDF 檔案的不便。

---

## 💻 技術棧 (Tech Stack)

* **框架**: [Next.js 15 (App Router)](https://nextjs.org/)
* **樣式**: [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
* **後端與資料庫**: [Supabase](https://supabase.com/) (PostgreSQL + Auth + RLS + Realtime)
* **拖曳互動**: [@dnd-kit/core](https://dndkit.com/) & Sortable
* **PWA**: `@ducanh2912/next-pwa`
* **其他**: Lucide Icons, Sonner (Toasts)

---

## 🚀 本地開發與部署 (Getting Started)

### 1. 系統需求 (Prerequisites)
- [Node.js](https://nodejs.org/) (建議 v18 以上)
- 一組 [Supabase](https://supabase.com/) 專案與對應的 Database 連線資訊

### 2. 環境變數設定
在專案根目錄建立 `.env.local` 檔案，並填入以下資訊：
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 用於 Server Actions 強制執行權限的操作 (可選，但建議有)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. 安裝依賴與執行
```bash
# 安裝依賴
npm install

# 執行開發伺服器
npm run dev
```
啟動後請前往 `http://localhost:3000` 預覽應用程式。

### 4. 資料庫建置 (Database Setup)
請開啟 Supabase 的 SQL Editor，依序執行專案中的 SQL 檔案：
1. 執行 `schema.sql` 與 `schema_v2.sql` 以建立表結構與關聯。
2. 執行 `dept_data.sql` 建立初期測試部門階層。
3. 執行 `fix_cards_rls.sql` 與 `fix_anomaly_report.sql` 完善動態權限與異常通報欄位。
4. 執行 `schema_settings.sql` 建立系統動態設定表 (用於工作區名稱與操作說明)。

---

## 🚢 部署 (Deploy on Vercel)

本專案強烈建議部署於 [Vercel](https://vercel.com)。由於本系統使用大量 Server Components (`react-server`) 與 Server Actions：

1. 將專案 Push 至 GitHub。
2. 在 Vercel 中 Import 該 Repository。
3. **重要**：請將同 `.env.local` 內容的環境變數加入 Vercel 的 Environment Variables 中。
4. 點選 Deploy。

> **注意**：Vercel 目前在建置 PWA 外掛時可能偶有衝突，若遇到建置失敗，請確認 `next.config.ts` 中 PWA 配置是否已加上 `disable: process.env.VERCEL === '1'`。

---

## 📜 授權 (License)

MIT License. 歡迎 Fork 與修改。
