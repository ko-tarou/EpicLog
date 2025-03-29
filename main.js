const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const generatePrompt = require('./scripts/history');
const generateStory = require('./scripts/storygen');

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
    // 書き込み先（userDataフォルダ）
    const userDataDir = app.getPath('userData');
    const inputPath = path.join(userDataDir, 'input_prompt.txt');
    const storyPath = path.join(userDataDir, 'story.txt');

    // プロンプト生成 → input_prompt.txt 書き込み
    await generatePrompt(inputPath);

    // 物語生成 → story.txt 書き込み
    const story = await generateStory(app.isPackaged, inputPath, storyPath);

    return story;
  } catch (err) {
    return Promise.reject(`❌ 実行エラー: ${err.message}`);
  }
});
