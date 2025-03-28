const fs = require('fs');
const path = require('path');
const os = require('os');
const sqlite3 = require('sqlite3').verbose();
const dayjs = require('dayjs');
const { platform } = process;

const TEMP_DIR = path.join(__dirname, 'temp_dbs');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR);

const macEpochOffset = 978307200;
const winEpochOffset = 11644473600;

const isMac = platform === 'darwin';
const isWin = platform === 'win32';

const browsers = [
  isMac && {
    name: 'Safari',
    dbPath: path.join(os.homedir(), 'Library', 'Safari', 'History.db'),
    query: `
      SELECT
        hi.url,
        hv.visit_time,
        'Safari' AS browser
      FROM
        history_visits hv
      JOIN
        history_items hi ON hv.history_item = hi.id
      WHERE
        hv.visit_time > ?
      ORDER BY
        hv.visit_time DESC
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
      SELECT
        url,
        last_visit_time,
        'Chrome' AS browser
      FROM
        urls
      WHERE
        last_visit_time > ?
      ORDER BY
        last_visit_time DESC
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
      SELECT
        url,
        last_visit_time,
        'Edge' AS browser
      FROM
        urls
      WHERE
        last_visit_time > ?
      ORDER BY
        last_visit_time DESC
      LIMIT 100
    `,
    getSince: () => (dayjs().subtract(1, 'day').unix() + winEpochOffset) * 1000000,
    adjustTime: t => Math.floor(t / 1000000 - winEpochOffset)
  }
].filter(Boolean);

let allResults = [];

function readHistory({ name, dbPath, query, getSince, adjustTime }) {
  return new Promise((resolve) => {
    if (!fs.existsSync(dbPath)) {
      console.log(`🔍 ${name} の履歴ファイルが見つかりませんでした`);
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

(async () => {
  for (const browser of browsers) {
    const results = await readHistory(browser);
    allResults.push(...results);
  }

  allResults.sort((a, b) => a.time.localeCompare(b.time));

  console.log('\n📖 過去24時間のブラウザ履歴：\n');
  allResults.forEach(r => {
    console.log(`[${r.browser}] ${r.time} - ${r.url}`);
  });

  // 🔥 プロンプト自動生成
  const promptHeader = 
  `# 最重要項目
日本語で全文出力すること

## 命令
あなたは日常を物語に変える詩的な作家です。
以下のブラウザ履歴をもとに、感情を交えてその人の1日を描写してください。

`;
  const limitedResults = allResults.slice(-30); // ←最後の30件だけ使う
  const promptBody = limitedResults.map(r => `[${r.browser}] ${r.time} - ${r.url}`).join('\n');

  // const promptBody = allResults.map(r => `[${r.browser}] ${r.time} - ${r.url}`).join('\n');
  const prompt = `${promptHeader}${promptBody}\n\n物語：`;

  fs.writeFileSync('input_prompt.txt', prompt, 'utf-8');
  console.log('\n📝 プロンプトを input_prompt.txt に保存しました！');
})();
