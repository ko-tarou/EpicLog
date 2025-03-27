const fs = require('fs');
const path = require('path');
const os = require('os');
const sqlite3 = require('sqlite3').verbose();
const dayjs = require('dayjs');

const SAFARI_HISTORY_PATH = path.join(
  os.homedir(),
  'Library',
  'Safari',
  'History.db'
);

const TEMP_DB = path.join(__dirname, 'history_safari.db');
fs.copyFileSync(SAFARI_HISTORY_PATH, TEMP_DB);

const macEpochOffset = 978307200;
const since = dayjs().subtract(1, 'day').unix() - macEpochOffset;

const db = new sqlite3.Database(TEMP_DB);

db.all(`
  SELECT
    hi.url,
    hv.visit_time
  FROM
    history_visits hv
  JOIN
    history_items hi ON hv.history_item = hi.id
  WHERE
    hv.visit_time > ?
  ORDER BY
    hv.visit_time DESC
  LIMIT 100
`, [since], (err, rows) => {
  if (err) {
    console.error('DB読み取りエラー:', err);
    return;
  }

  const results = rows.map(row => {
    const time = dayjs.unix(row.visit_time + macEpochOffset).format('YYYY-MM-DD HH:mm');
    return {
      time,
      url: row.url,
    };
  });

  console.log('📖 Safari - 過去24時間の履歴:');
  results.forEach(r => {
    console.log(`${r.time} - ${r.url}`);
  });

  db.close();
});
