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

ipcMain.handle('run-scripts', async () => {
  try {
    await generatePrompt();
    const isPackaged = app.isPackaged;
    const story = await generateStory(isPackaged); // ← パッケージ状態を渡す！
    return story;
  } catch (err) {
    return Promise.reject(`❌ 実行エラー: ${err.message}`);
  }
});
