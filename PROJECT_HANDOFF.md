# 🐾 寵物島市集 (Pet Island Market) - 專案技術交接白皮書

## 1. 專案定位與核心設計
- **專案名稱**：寵物島市集 (Pet Island Market)
- **目標受眾**：寵物島遊戲玩家，提供道具展示、交換許願清單與報價媒合平台。
- **視覺風格**：日系療癒風（奶油黃背景 `#FFFDF7`、暖棕文字 `#4A4238`、琥珀金主色 `#F59E0B`、高圓角卡片 `rounded-3xl`）。
- **本機開發路徑**：`C:\Users\Sata\Desktop\pet-island-market`
- **本機啟動指令**：`npx next dev --webpack`（注意：Windows 環境下需加 `--webpack` 參數以避開 Next.js 16 Turbopack 的 PostCSS 模組解析異常）。

---

## 2. 技術架構與套件版本
- **前端框架**：Next.js `16.4.6` (App Router) + React + TypeScript
- **樣式系統**：Tailwind CSS `v3`（已降版並配置標準 `postcss.config.mjs` 與 `tailwind.config.js`）
- **圖示庫**：`lucide-react`
- **後端與驗證**：Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- **部署平台**：Vercel

---

## 3. 環境變數設定 (`.env.local`)
專案使用 Supabase 傳統 JWT 格式的 `anon` `public` 金鑰（不可使用 `sb_publishable_` 新版格式，否則 `@supabase/ssr` 會報 `Invalid API key`）：
```env
NEXT_PUBLIC_SUPABASE_URL=[https://rdpsuqsgxpzawtununmx.supabase.co](https://rdpsuqsgxpzawtununmx.supabase.co)
NEXT_PUBLIC_SUPABASE_ANON_KEY=<eyJhbGciOi...開頭的 Legacy anon public key>