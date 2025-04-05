const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data'); // ← これを追加！
const historyFilePath = path.join(dataDir, 'history.json');

// ディレクトリがなければ作る
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// 履歴を保存する関数
function saveStoryLog(entry) {
  let logs = [];
  if (fs.existsSync(historyFilePath)) {
    logs = JSON.parse(fs.readFileSync(historyFilePath, 'utf-8'));
  }
  logs.push(entry);

  fs.writeFileSync(historyFilePath, JSON.stringify(logs, null, 2), 'utf-8');
}

module.exports = { saveStoryLog };
