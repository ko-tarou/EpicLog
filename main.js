const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,     // セキュリティ有効
      nodeIntegration: false      // require無効化（代わりに preload 経由で橋渡し）
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

// macOSでDockアイコンから再起動したとき対応
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// 全ウィンドウが閉じたら終了（Mac以外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// スクリプト実行のハンドラ
ipcMain.handle('run-scripts', async () => {
  return new Promise((resolve, reject) => {
    const command = 'node scripts/history.js && node scripts/storygen.js';
    exec(command, (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      resolve(stdout);
    });
  });
});
