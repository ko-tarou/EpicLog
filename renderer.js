const { ipcRenderer } = window;

document.getElementById('runBtn').addEventListener('click', async () => {
	const outputEl = document.getElementById('output');
	outputEl.textContent = '生成中...';
	try {
		const result = await window.ipcBridge.runScripts();
		outputEl.textContent = result;
	} catch (e) {
		outputEl.textContent = `エラー: ${e}`;
	}
});
