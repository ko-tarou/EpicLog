const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = async function generateStory(isPackaged = false) {
  return new Promise((resolve, reject) => {
    try {
      const baseDir = isPackaged ? process.resourcesPath : path.join(__dirname, '..');

      const llamaPath = path.join(baseDir, 'llama.cpp', 'build', 'bin', 'llama-cli');
      const modelPath = path.join(baseDir, 'llama.cpp', 'models', 'qwen2.5-7b-instruct-q5_k_m.gguf');
      const promptFilePath = path.join(baseDir, 'input_prompt.txt');
      const storyFilePath = path.join(baseDir, 'story.txt');

      if (!fs.existsSync(llamaPath)) {
        return reject(new Error(`llama-cli が見つかりませんでした: ${llamaPath}`));
      }

      if (!fs.existsSync(modelPath)) {
        return reject(new Error(`モデルファイルが見つかりませんでした: ${modelPath}`));
      }

      if (!fs.existsSync(promptFilePath)) {
        return reject(new Error(`プロンプトファイルが見つかりませんでした: ${promptFilePath}`));
      }

      const promptText = fs.readFileSync(promptFilePath, 'utf-8');

      const args = [
        '-m', modelPath,
        '-no-cnv',
        '--prompt', promptText,
        '-n', '512',
        '--color',
        '--temp', '0.8',
        '--top-p', '0.95',
        '--repeat_penalty', '1.1',
      ];

      console.log('🚀 Qwenに物語生成を依頼中...\n');

      const llama = spawn(llamaPath, args);

      let output = '';

      llama.stdout.on('data', (data) => {
        const text = data.toString();
        process.stdout.write(text);
        output += text;
      });

      llama.stderr.on('data', (data) => {
        console.error(`[stderr] ${data}`);
      });

      llama.on('close', () => {
        try {
          fs.writeFileSync(storyFilePath, output, 'utf-8');
          console.log(`\n📚 物語を story.txt に保存しました！`);
          resolve(output);
        } catch (err) {
          reject(new Error(`story.txt の書き込み失敗: ${err.message}`));
        }
      });

      llama.on('error', (err) => {
        reject(new Error(`llama-cli 実行エラー: ${err.message}`));
      });
    } catch (err) {
      reject(new Error(`generateStory 内部エラー: ${err.message}`));
    }
  });
};
