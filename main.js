const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const generatePrompt = require('./scripts/history');

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

ipcMain.handle('run-scripts', async () => {
  const storygenPath = path.join(__dirname, 'scripts', 'storygen.js');
  const storyFilePath = path.join(__dirname, 'story.txt');

  try {
    // Step 1: 履歴取得（内部実行）
    await generatePrompt();

    // Step 2: 物語生成スクリプトを spawn
    const { spawn } = require('child_process');
    return new Promise((resolve, reject) => {
      const child = spawn('node', [storygenPath]);

      let output = '';
      child.stdout.on('data', data => output += data.toString());
      child.stderr.on('data', data => console.error(data.toString()));
      child.on('close', code => {
        try {
          const story = fs.readFileSync(storyFilePath, 'utf-8');
          resolve(story);
        } catch (err) {
          reject(`✅ 実行完了（story.txt 読み込み失敗）: ${err.message}`);
        }
      });
    });
  } catch (err) {
    return Promise.reject(`❌ 履歴取得エラー: ${err.message}`);
  }
});
