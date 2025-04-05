const { app, BrowserWindow, ipcMain } = require('electron'); // ✅ ここで全部まとめてOK
const path = require('path');
const fs = require('fs');
const generatePrompt = require('./scripts/history');
const generateStory = require('./scripts/storygen');
const { saveStoryLog } = require('./scripts/storage'); // ✅ OK

// 保存イベントの受け取り
ipcMain.on('save-story', (event, data) => {
  saveStoryLog(data);
});

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

// スクリプト実行ハンドラ
ipcMain.handle('run-scripts', async () => {
  try {
    const userDataDir = app.getPath('userData');
    const inputPath = path.join(userDataDir, 'input_prompt.txt');
    const storyPath = path.join(userDataDir, 'story.txt');

    // プロンプト生成 → ファイル書き出し
    await generatePrompt(inputPath);

    // LLMによる生成 → 結果を取得
    const story = await generateStory(app.isPackaged, inputPath, storyPath);

    return story; // ← ストーリー本文のみ返す
  } catch (err) {
    return Promise.reject(`❌ 実行エラー: ${err.message}`);
  }
});
