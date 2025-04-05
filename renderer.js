const runBtn = document.getElementById('runBtn');
const outputEl = document.getElementById('output');
const placeholderText = document.getElementById('placeholderText');
const saveBtn = document.getElementById('saveBtn');
const discardBtn = document.getElementById('discardBtn');

let lastGeneratedStory = '';

runBtn.addEventListener('click', async () => {
  // 初期状態リセット
  runBtn.style.display = 'none';
  placeholderText.textContent = '生成中...';
  saveBtn.classList.add('hidden');
  discardBtn.classList.add('hidden');

  try {
    const result = await window.ipcBridge.runScripts(); // ← ストーリー本文だけを返す前提

    lastGeneratedStory = result;
    outputEl.innerHTML = `<p class="whitespace-pre-wrap mb-4">${lastGeneratedStory}</p>`;

    saveBtn.classList.remove('hidden');
    discardBtn.classList.remove('hidden');
  } catch (e) {
    outputEl.innerHTML = `<p class="text-red-400">エラー: ${e}</p>`;
  }
});

discardBtn.addEventListener('click', () => {
  outputEl.innerHTML = `
    <p id="placeholderText" class="mb-4">Your dramatic tale will appear here...</p>
    <button id="runBtn" class="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded shadow flex items-center">
      ✨ Generate Epic Tale
    </button>
  `;
  saveBtn.classList.add('hidden');
  discardBtn.classList.add('hidden');

  document.getElementById('runBtn').addEventListener('click', async () => {
    runBtn.style.display = 'none';
    outputEl.innerHTML = `<p class="mb-4">生成中...</p>`;
    try {
      const result = await window.ipcBridge.runScripts();
      lastGeneratedStory = result;
      outputEl.innerHTML = `<p class="whitespace-pre-wrap mb-4">${lastGeneratedStory}</p>`;
      saveBtn.classList.remove('hidden');
      discardBtn.classList.remove('hidden');
    } catch (e) {
      outputEl.innerHTML = `<p class="text-red-400">エラー: ${e}</p>`;
    }
  });
});

saveBtn.addEventListener('click', () => {
  if (!lastGeneratedStory) return;

  const entry = {
    date: new Date().toISOString(),
    story: lastGeneratedStory
  };

  window.ipcBridge.saveStory(entry);

  outputEl.innerHTML += `<p class="text-green-500 mt-2">✅ 保存しました</p>`;
  saveBtn.classList.add('hidden');
  discardBtn.classList.add('hidden');
});
