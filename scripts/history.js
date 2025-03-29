const fs = require('fs');
const path = require('path');
const os = require('os');
const sqlite3 = require('sqlite3').verbose();
const dayjs = require('dayjs');
const { platform } = process;
const { dialog } = require('electron');

module.exports = async function generatePrompt(savePath) {
  const TEMP_DIR = path.join(__dirname, '..', 'temp_dbs');
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

  const macEpochOffset = 978307200;
  const winEpochOffset = 11644473600;
  const isMac = platform === 'darwin';
  const isWin = platform === 'win32';

  function hasAccessToFile(filePath) {
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  const browsers = [
    isMac && {
      name: 'Safari',
      dbPath: path.join(os.homedir(), 'Library', 'Safari', 'History.db'),
      query: `
        SELECT hi.url, hv.visit_time, 'Safari' AS browser
        FROM history_visits hv
        JOIN history_items hi ON hv.history_item = hi.id
        WHERE hv.visit_time > ?
        ORDER BY hv.visit_time DESC
        LIMIT 100
      `,
      getSince: () => dayjs().subtract(1, 'day').unix() - macEpochOffset,
      adjustTime: t => t + macEpochOffset
    },
    {
      name: 'Chrome',
      dbPath: isMac
        ? path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome', 'Default', 'History')
        : path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data', 'Default', 'History'),
      query: `
        SELECT url, last_visit_time, 'Chrome' AS browser
        FROM urls
        WHERE last_visit_time > ?
        ORDER BY last_visit_time DESC
        LIMIT 100
      `,
      getSince: () => (dayjs().subtract(1, 'day').unix() + winEpochOffset) * 1000000,
      adjustTime: t => Math.floor(t / 1000000 - winEpochOffset)
    },
    {
      name: 'Edge',
      dbPath: isMac
        ? path.join(os.homedir(), 'Library', 'Application Support', 'Microsoft Edge', 'Default', 'History')
        : path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Edge', 'User Data', 'Default', 'History'),
      query: `
        SELECT url, last_visit_time, 'Edge' AS browser
        FROM urls
        WHERE last_visit_time > ?
        ORDER BY last_visit_time DESC
        LIMIT 100
      `,
      getSince: () => (dayjs().subtract(1, 'day').unix() + winEpochOffset) * 1000000,
      adjustTime: t => Math.floor(t / 1000000 - winEpochOffset)
    }
  ].filter(Boolean);

  function readHistory({ name, dbPath, query, getSince, adjustTime }) {
    return new Promise((resolve) => {
      if (!fs.existsSync(dbPath)) {
        console.log(`🔍 ${name} の履歴ファイルが見つかりませんでした`);
        return resolve([]);
      }

      if (!hasAccessToFile(dbPath)) {
        console.log(`⚠️ ${name} の履歴にアクセスできません`);
        dialog.showMessageBoxSync({
          type: 'warning',
          title: 'フルディスクアクセスが必要です',
          message: `${name} の履歴にアクセスするには、\n\n「システム設定 > プライバシーとセキュリティ > フルディスクアクセス」で\nEpicLog を許可してください。\n\nその後アプリを再起動してください。`
        });
        return resolve([]);
      }

      const tempPath = path.join(TEMP_DIR, `${name}_copy.db`);
      fs.copyFileSync(dbPath, tempPath);

      const db = new sqlite3.Database(tempPath);
      db.all(query, [getSince()], (err, rows) => {
        if (err) {
          console.error(`❌ ${name} 読み込みエラー:`, err.message);
          return resolve([]);
        }

        const results = rows.map(row => ({
          time: dayjs.unix(adjustTime(row.last_visit_time || row.visit_time)).format('YYYY-MM-DD HH:mm'),
          url: row.url,
          browser: row.browser || name
        }));

        db.close();
        resolve(results);
      });
    });
  }

  let allResults = [];
  for (const browser of browsers) {
    const results = await readHistory(browser);
    allResults.push(...results);
  }

  allResults.sort((a, b) => a.time.localeCompare(b.time));

  const promptHeader = 
`# 最重要項目
物語が終わったら、出力を停止すること
200文字以内に収めること

## 重要項目
日本語で全文出力すること
物語の中身だけを出力すること
この指示文を含めないこと

## 命令
あなたは日常を物語に変える詩的な作家です。
以下のブラウザ履歴をもとに、感情を交えてその人の1日を描写してください。

`;
  const limitedResults = allResults.slice(-30);
  const promptBody = limitedResults.map(r => `[${r.browser}] ${r.time} - ${r.url}`).join('\n');
  const prompt = `${promptHeader}${promptBody}\n\n物語：`;

  fs.writeFileSync(savePath, prompt, 'utf-8');
  console.log(`📝 プロンプトを保存しました！ → ${savePath}`);
};
