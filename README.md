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

---

## � 使用與操作說明 (Usage Guide)

本系統提供直覺的使用者介面，以下為主要操作說明：

1. **基本看板操作**：
   - **新增卡片**：點選列表下方的「新增卡片」，輸入標題與內容。支援設定「優先級別」、「標籤」與「指派人員」。
   - **狀態拖曳**：將卡片在不同的列表 (如：待處理、進行中、已完成) 之間拖曳，系統會即時儲存狀態並同步給其他使用者。
   - **編輯與刪除**：點選卡片右上角的選單圖示可進行編輯或刪除 (需具備相應權限)。編輯器支援 Rich Text 豐富格式與圖片上傳。

2. **部門切換與視角設定**：
   - 點擊左上角的「部門選擇器」，可切換至您有權限查看的不同部門看板。
   - 具備上層權限者，可選擇「總覽視圖」，一次查看轄下所有子部門的任務。

3. **系統設定與動態操作手冊**：
   - **動態手冊**：點擊右上角的「📘 操作說明」，即可檢視系統最新版的操作手冊。
   - **後台管理**：具備管理員權限者，可進入「系統設定」動態編輯操作說明的內容、設定全站的工作區名稱等。

4. **行事曆與事件管理**：
   - 切換至「行事曆」頁籤，可依月份或週檢視重要事件與會議。
   - 支援事件的「每週/每月重複」設定，並可調整日曆的字體大小以適應不同螢幕。

---

## 🏗 系統架構說明 (Architecture Overview)

本系統採用現代化 Web 技術棧，強調高效能、高安全性與即時協作：

- **前端框架 (Frontend)**：
  - 基於 **Next.js 15 (App Router)** 建構，充分利用 React Server Components (RSC) 與 Server Actions，減少客戶端 JavaScript 載入量，並提升 API 互動安全性。
  - UI 刻板採用 **Tailwind CSS** 與 **shadcn/ui**，確保介面一致性與響應式設計 (RWD)。
  - 拖曳互動核心採用 **@dnd-kit/core**，提供流暢的 Kanban 拖曳體驗。

- **後端與資料庫 (Backend & Database)**：
  - 採用 **Supabase** 作為 Backend-as-a-Service (BaaS)。
  - 資料庫為 **PostgreSQL**，利用 **Row Level Security (RLS)** 針對不同部門與角色實作資料列級別的存取控制，確保跨部門資料絕對隔離。
  - **即時同步 (Realtime)**：透過 Supabase Realtime 訂閱資料庫變更，實現多使用者同時操作看板時的即時狀態更新。

- **身分驗證與授權 (Auth & Authorization)**：
  - Supabase Auth 整合，支援電子郵件或第三方登入。
  - 實作 Role-Based Access Control (RBAC)，區分 `admin`、`department_admin` 及一般使用者。

- **漸進式網路應用程式 (PWA)**：
  - 整合 `@ducanh2912/next-pwa`，支援行動裝置與平板安裝至桌面、提供離線快取與接近原生 App 的體驗，適合工廠現場無縫使用。

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

# 用於 Server Actions 強制執行權限的操作 (可選)
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. 安裝與執行
```bash
npm install
npm run dev
```
啟動後請前往 `http://localhost:3000` 預覽。資料庫建置請參考專案內的 SQL 遷移腳本 (`schema.sql`, `fix_cards_rls.sql` 等檔案，請依序在 Supabase SQL Editor 執行)。

---

## 🚢 部署 (Deploy on Vercel)

本專案強烈建議部署於 [Vercel](https://vercel.com)：
1. 將專案 Push 至 GitHub。
2. 在 Vercel 中 Import 該 Repository。
3. 加入對應的 Environment Variables (`NEXT_PUBLIC_SUPABASE_URL` 等)。
4. 點選 Deploy。

> **注意**：Vercel 目前在建置 PWA 外掛時可能偶有衝突，若遇到建置失敗，請確認 `next.config.ts` 中 PWA 配置是否已加上 `disable: process.env.VERCEL === '1'`。

---

## 🐙 GitHub 說明與貢獻指南 (GitHub Repository & Contribution)

歡迎參與貢獻！為了保持專案的穩定性與程式碼品質，請參考以下指南：

- **分支策略 (Branching Strategy)**：
  - `main`：主要穩定分支，隨時可部署至生產環境。
  - `dev` 或 `feature/*`：開發新功能或修復 Bug 時，請從 `main` 建立新的功能分支。

- **如何貢獻 (How to Contribute)**：
  1. Fork 本專案到您的 GitHub 帳號。
  2. Clone 到本地端：`git clone https://github.com/your-username/kanban-system.git`
  3. 建立新的分支：`git checkout -b feature/your-feature-name`
  4. 進行開發並提交您的更改 (請遵循清晰的 Commit 訊息規範)。
  5. 將分支 Push 至您的 Fork 倉庫：`git push origin feature/your-feature-name`
  6. 回到本專案建立 Pull Request (PR)，並詳細描述您的修改內容。

- **問題回報 (Issue Tracking)**：
  - 若發現 Bug 或有新功能建議，請至 GitHub Issues 頁面建立新的 Issue，並盡可能提供重現步驟與截圖。

---

## 📜 授權 (License)

MIT License. 歡迎 Fork 與修改。
