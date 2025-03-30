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

  // よく使うサービスの日本語化マップ
  const domainMap = {
    'deepl.com': 'DeepL翻訳',
    'chat.openai.com': 'ChatGPT',
    'drive.google.com': 'Googleドライブ',
    'mail.google.com': 'Gmail',
    'v0.dev': 'プロジェクトV0',
    'github.com': 'GitHub',
    'notion.so': 'Notion',
    'youtube.com': 'YouTube',
  };

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

  async function readHistory({ name, dbPath, query, getSince, adjustTime }) {
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
          message: `${name} の履歴にアクセスするには、「プライバシーとセキュリティ > フルディスクアクセス」でEpicLogを許可してください。`
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

        const results = rows.map(row => {
          try {
            const parsed = new URL(row.url);
            let domain = parsed.hostname.replace(/^www\./, '');
            const readable = domainMap[domain] || domain.replace(/\.com$/, 'サービス');

            return {
              time: dayjs.unix(adjustTime(row.last_visit_time || row.visit_time)).format('YYYY-MM-DD HH:mm'),
              url: readable,
              browser: name
            };
          } catch {
            return null;
          }
        }).filter(Boolean);

        console.log(`📥 ${name} から ${results.length} 件の履歴を取得`);

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
  const limitedResults = allResults.slice(-30);

  const prompt = `
# 出力ルール
- 解説や注釈を含めないこと
- 物語を終えたら、「終了」と記載し、終了すること
- 400文字以内を厳守

# 命令
以下のサービス利用履歴をもとに、
ユーザーがどのような一日を過ごしたか、
感情や雰囲気も交えて物語として400字程度で描写してください。
すべて日本語で出力すること。

${limitedResults.map(r => `[${r.browser}] ${r.time} - ${r.url}`).join('\n')}

物語：
`.trim();

  fs.writeFileSync(savePath, prompt, 'utf-8');
  console.log(`📝 プロンプトを保存しました！ → ${savePath}`);

  console.log('\n--- プロンプト内容 ---\n');
  console.log(prompt);
  console.log('\n---------------------\n');
};
