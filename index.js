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

// ブラウザ情報をOSごとに定義
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
].filter(Boolean); // Safari は mac 以外では undefined になるので除外

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
})();
