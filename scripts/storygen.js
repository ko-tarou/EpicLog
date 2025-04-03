const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = async function generateStory(isPackaged = false, promptFilePath, storyFilePath) {
  const baseDir = isPackaged ? process.resourcesPath : path.join(__dirname, '..');
  const llamaPath = path.join(baseDir, 'llama.cpp', 'build', 'bin', 'llama-cli');
  const modelPath = path.join(baseDir, 'llama.cpp', 'models', 'qwen2.5-7b-instruct-q5_k_m.gguf');

  if (!fs.existsSync(llamaPath)) throw new Error(`llama-cli が見つかりませんでした: ${llamaPath}`);
  if (!fs.existsSync(modelPath)) throw new Error(`モデルファイルが見つかりませんでした: ${modelPath}`);
  if (!fs.existsSync(promptFilePath)) throw new Error(`プロンプトファイルが見つかりませんでした: ${promptFilePath}`);

  const promptText = fs.readFileSync(promptFilePath, 'utf-8');

  const callLlama = (prompt, maxTokens = '512') => {
    return new Promise((resolve, reject) => {
      const args = [
        '-m', modelPath,
        '-no-cnv',
        '--prompt', prompt,
        '-n', maxTokens,
        '--color',
        '--temp', '0.8',
        '--top-p', '0.95',
        '--repeat_penalty', '1.1',
      ];

      const llama = spawn(llamaPath, args);
      let output = '';

      llama.stdout.on('data', (data) => output += data.toString());
      llama.stderr.on('data', (data) => console.error(`[stderr] ${data}`));
      llama.on('close', () => resolve(output));
      llama.on('error', (err) => reject(err));
    });
  };

  // Step 1: 初稿生成
  console.log('📝 Step 1: 物語の初稿を生成中...');
  const rawOutput = await callLlama(promptText);
  const firstMatch = rawOutput.match(/物語：([\s\S]*)/);
  let draftStory = firstMatch ? firstMatch[1].trim() : rawOutput.trim();

  draftStory = draftStory.split(/終了|end of text/i)[0].trim();

  // 👇 ログ出力を追加
  console.log('\n--- 初稿出力（rawOutput） ---\n');
  console.log(draftStory);
  console.log('\n-----------------------------\n');

  // Step 2: 要約・圧縮
  console.log('🔁 Step 2: 要約・詩的に整形中...');
  const refinePrompt = `
# 出力ルール
- 全文正しい日本語で出力して
- 解説や注釈を含めないこと
- 物語を終えたら、「終了」と記載し、終了すること

## 命令
以下の物語を、重複なくし、余計な記号や命令文を含めないように整えてください。

## 注意
- "深夜", "翻訳", "情報" などの単語を、崩さず正しく出力してください。
- 文字が欠けたり壊れたりしないように注意すること。

${draftStory}

詩的な物語：
  `.trim();

  const refinedOutput = await callLlama(refinePrompt, '300');
  const refinedMatch = refinedOutput.match(/詩的な物語：([\s\S]*)/);
  let finalStory = refinedMatch ? refinedMatch[1].trim() : refinedOutput.trim();

  // Step 3: 出力クリーンアップ
  console.log('🧹 Step 3: 出力クリーニング中...');
  const cutMarkers = [
    '（', '#', '##', '詩的な物語：', '物語：', '洗練された物語：',
    '[Safari]', '[Chrome]', '[Edge]', '出力ルール', '命令'
  ];

  // 含まれてはいけない行を消す
  finalStory = finalStory
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !cutMarkers.some(marker => line.includes(marker)))
    .join('\n');
  
  finalStory = finalStory.split(/終了|end of text/i)[0].trim();

  // 文字化け行（�）を除去
  finalStory = finalStory
  .split('\n')
  .map(line => line.trim())
  .filter(line => line.length > 0 && !line.includes('�'))
  .join('\n');

  fs.writeFileSync(storyFilePath, finalStory, 'utf-8');
  console.log(`📚 Final story saved to ${finalStory}`);

  return finalStory;
};
