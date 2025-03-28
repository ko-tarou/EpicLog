const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// 履歴 → 物語生成 → 結果表示
ipcMain.handle('run-scripts', async () => {
  return new Promise((resolve, reject) => {
    const historyPath = path.join(__dirname, 'scripts', 'history.js');
    const storygenPath = path.join(__dirname, 'scripts', 'storygen.js');
    const storyFilePath = path.join(__dirname, 'story.txt');

    // Step 1: 履歴取得スクリプトの実行
    execFile('node', [historyPath], (err1) => {
      if (err1) return reject(`❌ 履歴取得エラー: ${err1.message}`);

      // Step 2: 物語生成スクリプトの実行
      execFile('node', [storygenPath], (err2) => {
        if (err2) return reject(`❌ 物語生成エラー: ${err2.message}`);

        // Step 3: story.txt を読み込んで返す
        try {
          const story = fs.readFileSync(storyFilePath, 'utf-8');
          resolve(story);
        } catch (readErr) {
          reject(`✅ 実行完了（ただし story.txt 読み取り失敗）: ${readErr.message}`);
        }
      });
    });
  });
});
