# 我的作品集：物件導向程式設計

> 這是你整學期的作品集 repo：後未來動物園 M0 到 M6 七站的作品、你的 AI 工作流、你的成長紀錄，全部在這裡累積。
> 課程頁：<https://course.interaction.tw/oop/>（每週進度、各站步驟與截止時間都在課程頁）

## 開工：在自己的筆電上（主要路線）

1. 裝 [GitHub Desktop](https://desktop.github.com/)，用你的 GitHub 帳號登入
2. 在 GitHub Desktop 選 **File → Clone repository**，挑這個 repo，存放位置用預設的「文件」裡的 GitHub 資料夾，按 **Clone**
3. 照課程頁「開工準備」裝好 agy（Mac 與 Windows 的指令都在那裡）
4. 在 GitHub Desktop 選 **Repository → Open in Terminal**（Windows 是 **Open in Command Prompt**），終端機會開在這個 repo 裡，輸入 `agy` 啟動
5. 開工先問它「AGENTS.md 裡的課堂公約有哪幾條」，答得出來就代表它讀到了
6. 做完回到 GitHub Desktop：左下角寫一句這次做了什麼，按藍色的 **Commit** 按鈕，再按上方的 **Push origin**，交上去的才算數

已經在用 Claude 或 ChatGPT 的同學，第 3 步可以改裝 Claude Code 或 Codex，指令也在課程頁「開工準備」。

## 這個 repo 的結構

七個里程碑資料夾已經幫你建好了，每個裡面都有一份 `README.md`，寫著那一站要交什麼、截止時間，以及你要填的反思與 AI 揭露欄。**資料夾名稱不要改、不要搬位置**，老師整學期都從這七個資料夾看你的進度。

```
AGENTS.md         ← 你的 AI 工作流與課堂公約（agy、Codex 自動讀，M0 就寫下三條自己的規則，之後持續補）
CLAUDE.md         ← 給 Claude Code 的入口，第一行把 AGENTS.md 接進來
.devcontainer/    ← 雲端工作室的環境定義（Claude Code 已預裝），你不用動它
m0-outfit/        ← M0 裝備（先不收）：會呼吸的圓已經放在裡面，讓 AI 出錯的截圖也放這
m1-world/         ← M1 世界（10/1，世界分享）：分享用的簡報、草圖或筆記，形式不限
m2-species/       ← M2 物種（10/15，報告站）：物種設定書、會動的雛形＋m2-簡報.pdf
m3-creature/      ← M3 個體（11/12，報告站）：有天性的個體＋m3-簡報.pdf
m4-population/    ← M4 族群（12/3）：一群牠
m5-habitat/       ← M5 棲地（12/17）：棲地與互動
m6-zoo/           ← M6 開園（12/24，報告站）：展出版本＋m6-簡報.pdf
```

每一站的資料夾裡：作品檔案直接放進去，`README.md` 填反思與 AI 揭露欄，過程筆記與物種日誌寫 `notes.md`（需要時自己建）。

## 交作業（四件套）

每一站的資料夾裡要有：

1. **程式碼**：可執行（p5.js 網頁作品＝`index.html`＋`sketch.js`）
2. **截圖或影片**：放進同一個資料夾
3. **反思**：`README.md` 裡寫 100 到 200 字（自己寫，AI 不代寫）
4. **AI 揭露欄**：`README.md` 裡照下表填（沒用到就寫「未使用」）

```markdown
## AI 揭露欄
| 項目 | 內容 |
|------|------|
| 工具 | （例：agy／Claude Code／未使用） |
| 日期 | |
| prompt 摘要 | |
| 採用範圍 | （哪些碼／想法來自 AI，自己改了什麼） |
```

各站截止時間寫在課程頁的里程碑指南與交付方式，截止前交上去就算繳交。commit 的時間戳就是紀錄，每一步嘗試都是過程的證據。

## 第一次試跑（M0 的程式碼就用它）

`m0-outfit/` 裡已經放好兩個檔案，你不用自己建，內容長這樣：

**`m0-outfit/index.html`**

```html
<!doctype html>
<html lang="zh-TW">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>我的第一個動畫</title>
    <script src="https://cdn.jsdelivr.net/npm/p5@2/lib/p5.min.js"></script>
    <style>html,body{margin:0;height:100%}main{display:flex;justify-content:center;align-items:center;height:100%}</style>
  </head>
  <body>
    <main></main>
    <script src="sketch.js"></script>
  </body>
</html>
```

**`m0-outfit/sketch.js`**

```js
function setup() {
  createCanvas(600, 600)
}

function draw() {
  background(253, 252, 249)
  circle(width / 2, height / 2, 100 + 20 * sin(frameCount * 0.05))
}
```

### 看結果

- **筆電上**：在 Finder 或檔案總管對 `index.html` 按兩下，用瀏覽器打開就看得到
- **Codespace 裡**：對 `index.html` 按右鍵選「Show Preview」，碼在左、動畫在右，改一行預覽就跟著更新。要給別人看，終端機跑 `npx live-server m0-outfit`，再到 Ports 面板把該埠設成 Public

一顆會呼吸的圓動起來，就代表環境沒問題。M0 的四件套：這組程式碼、「讓 AI 出錯」實驗的截圖、`m0-outfit/README.md` 裡的反思與 AI 揭露欄。

## 簡報上傳（M1／M2／M3／M6 報告站）

報告站每個人都要上台簡報，簡報檔跟四件套一起放進**該站資料夾**：

1. **匯出成 PDF**：PowerPoint、Keynote、Google Slides、Canva 都有「匯出／下載 PDF」。一律傳 PDF，GitHub 網頁能直接翻頁預覽，老師點開就能看，pptx 傳上去只能下載、不能預覽
2. **取名放對位置**：檔名用里程碑代號加「-簡報.pdf」，放進該站資料夾，例如：

   ```
   m1-world/m1-簡報.pdf
   m2-species/m2-簡報.pdf
   m3-creature/m3-簡報.pdf
   m6-zoo/m6-簡報.pdf
   ```

3. **交上去（三種方法挑一種）**：
   - **GitHub Desktop**：把 PDF 放進筆電上的該站資料夾，回到 GitHub Desktop 寫一句訊息，按 **Commit**，再按 **Push origin**
   - **Codespace**：把 PDF 拖進左邊檔案總管的該站資料夾，Source Control 寫一句訊息，按 **Commit**，再按 **Sync Changes**
   - **repo 網頁**：打開你的 repo，點進該站資料夾，**Add file → Upload files**，拖檔案進去，按 **Commit changes**（單檔上限 25MB，超過幾乎都是簡報裡塞了影片，把影片抽出來另外放進資料夾，簡報裡留截圖就好）。用網頁上傳之後，回到筆電在 GitHub Desktop 按 **Fetch origin** 再按 **Pull origin**，兩邊才會一致
4. **驗收**：交上去之後打開 repo 網頁，點那個 PDF，**能翻頁預覽就是交付成功**，老師看到的就是這個畫面

用 Google Slides 報告的人：PDF 照傳一份，想附雲端連結的話記得開「知道連結的使用者皆可檢視」，再把連結寫進該站 `README.md`。連結會失效、PDF 不會，**PDF 才是交付本體**。

## 備援：雲端工作室（Codespaces）

筆電不在身邊、要在學校電腦上工作時，可以用瀏覽器開雲端工作室，學校電腦被還原也不受影響。Codespace 目前只預裝 Claude Code，要有 Claude 訂閱才能在裡面用 AI 代理。沒有筆電、也沒有 Claude 訂閱的同學，上課時直接找老師個別安排。

1. 開瀏覽器登入 [github.com](https://github.com)，進到你的這個 repo
2. 綠色 **Code** 按鈕 → **Codespaces** → **Create codespace on main**（第二次以後，同一個地方會看到你之前的 codespace，點開即續）
3. 等瀏覽器裡出現 **VS Code 版面**，這就是你的工作環境
4. 下方終端機輸入 `claude`，照下面的「Claude 登入」做，不要等它自動開瀏覽器
5. 做完記得：**Source Control 面板 → Commit → Sync Changes**。回到筆電時，在 GitHub Desktop 按 **Fetch origin** 再按 **Pull origin**，把雲端做的拿回來

### Claude 登入（Codespace 裡一定要走手動流程）

Codespace 是雲端容器，登入的自動跳轉到不了它，要手動貼授權碼：

1. 終端機打 `claude`，選 **Claude account with subscription**
2. 畫面會印出一條**登入網址**。先把終端機面板拉大，然後在網址上**連點三下（快速點三次）**，會一次全選整條網址（包含換行的部分），再複製（按 `c` 理論上會自動複製，但瀏覽器常擋剪貼簿權限，實測直接三連點反白最可靠）
3. 開新分頁貼上網址，登入 Claude 帳號並授權
4. 頁面顯示一組**授權碼**，複製後回終端機貼在 `Paste code here…`，按 Enter

排錯：

- 出現「Invalid OAuth Request，Unknown scope: …」？網址在複製時**掉了字元**（用拖曳框選跨行網址的經典後果）。回到第 2 步用**三連點**重新全選複製，或直接在瀏覽器網址列把拼錯的 scope 改對（例：`fil_upload` 改成 `file_upload`）重新載入
- 授權完跳到「無法連上 localhost」錯誤頁？看**網址列**，把 `code=` 後面那串複製回終端機貼上即可
- 貼上沒反應？終端機用**右鍵 → 貼上**或 `Ctrl+Shift+V`，再不行就檢查 `claude --version` 是否 ≥ 2.1.108，舊了就 `npm install -g @anthropic-ai/claude-code@latest`

### Codespaces 三件事

- **用 2-core 機型就好**（預設就是）：學生帳號每月 180 core-hours，也就是 90 小時，夠用，開大機型會加倍燒
- 閒置 30 分鐘會自動休眠（重開即續），**閒置 30 天 codespace 會被刪**，所以做完一定要交上去，repo 裡的東西不會消失
- 第一次用若被要求設定 spending budget，設 $0 即可（課堂上會帶大家走一遍）

## 你的 AI 工作流

`AGENTS.md` 是你的：課堂五條公約寫在裡面（不可刪），其餘部分隨學期自己長出來，你的偏好、你的流程、你踩過的坑。學期末它就是你帶得走的工作方法。

p5.js 也可以用[網頁編輯器](https://editor.p5js.org)寫（一樣存雲端），寫完把碼貼回該站資料夾即可。
