const runBtn = document.getElementById('runBtn');
const outputEl = document.getElementById('output');
const placeholderText = document.getElementById('placeholderText');
const saveBtn = document.getElementById('saveBtn');
const discardBtn = document.getElementById('discardBtn');
const showHistoryBtn = document.getElementById('showHistoryBtn');
const historyList = document.getElementById('historyList');

let lastGeneratedStory = '';

// 物語生成ボタン
runBtn.addEventListener('click', async () => {
  runBtn.style.display = 'none';
  placeholderText.textContent = '生成中...';
  saveBtn.classList.add('hidden');
  discardBtn.classList.add('hidden');

  try {
    const result = await window.ipcBridge.runScripts(); // ストーリー本文だけを返す前提
    lastGeneratedStory = result;
    outputEl.innerHTML = `<p class="whitespace-pre-wrap mb-4">${lastGeneratedStory}</p>`;
    saveBtn.classList.remove('hidden');
    discardBtn.classList.remove('hidden');
  } catch (e) {
    outputEl.innerHTML = `<p class="text-red-400">エラー: ${e}</p>`;
  }
});

// Discardボタン（初期化）
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

// 保存ボタン
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

// 履歴表示ボタン
showHistoryBtn.addEventListener('click', async () => {
  const logs = await window.ipcBridge.loadHistory();

  if (!logs.length) {
    historyList.innerHTML = '<li class="text-gray-400">履歴がまだありません</li>';
    return;
  }

  historyList.innerHTML = '';
  logs.reverse().forEach(entry => {
    const li = document.createElement('li');
    li.className = 'bg-gray-800 text-yellow-100 p-4 rounded shadow';
    li.innerHTML = `
      <p class="text-sm text-yellow-400">${new Date(entry.date).toLocaleString()}</p>
      <p class="mt-2 whitespace-pre-wrap">${entry.story}</p>
    `;
    historyList.appendChild(li);
  });
});
