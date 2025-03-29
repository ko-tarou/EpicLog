const runBtn = document.getElementById('runBtn');
const outputEl = document.getElementById('output');
const placeholderText = document.getElementById('placeholderText');
const saveBtn = document.getElementById('saveBtn');
const discardBtn = document.getElementById('discardBtn');

runBtn.addEventListener('click', async () => {
  // 初期状態リセット
  runBtn.style.display = 'none';
  placeholderText.textContent = '生成中...';
  saveBtn.classList.add('hidden');
  discardBtn.classList.add('hidden');

  try {
    const result = await window.ipcBridge.runScripts();

    // 出力表示
    outputEl.innerHTML = `<p class="whitespace-pre-wrap mb-4">${result}</p>`;

    // ボタン再表示
    saveBtn.classList.remove('hidden');
    discardBtn.classList.remove('hidden');
  } catch (e) {
    outputEl.innerHTML = `<p class="text-red-400">エラー: ${e}</p>`;
  }
});

// Discard ボタンで初期状態に戻す処理
discardBtn.addEventListener('click', () => {
  outputEl.innerHTML = `
    <p id="placeholderText" class="mb-4">Your dramatic tale will appear here...</p>
    <button id="runBtn" class="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded shadow flex items-center">
      ✨ Generate Epic Tale
    </button>
  `;
  saveBtn.classList.add('hidden');
  discardBtn.classList.add('hidden');

  // 再度バインド（動的に作り直したので）
  document.getElementById('runBtn').addEventListener('click', async () => {
    runBtn.style.display = 'none';
    outputEl.innerHTML = `<p class="mb-4">生成中...</p>`;
    try {
      const result = await window.ipcBridge.runScripts();
      outputEl.innerHTML = `<p class="whitespace-pre-wrap mb-4">${result}</p>`;
      saveBtn.classList.remove('hidden');
      discardBtn.classList.remove('hidden');
    } catch (e) {
      outputEl.innerHTML = `<p class="text-red-400">エラー: ${e}</p>`;
    }
  });
});
