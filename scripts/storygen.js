const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..');

const modelPath = path.join(baseDir,'llama.cpp', 'models', 'qwen2.5-7b-instruct-q5_k_m.gguf');
const llamaPath = path.join(baseDir, 'llama.cpp', 'build', 'bin', 'llama-cli');
const promptFilePath = path.join(baseDir, 'scripts','input_prompt.txt');

// 🔽 プロンプトをファイルから読み込み
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

llama.on('close', (code) => {
  fs.writeFileSync('story.txt', output, 'utf-8');
  console.log(`\n📚 物語を story.txt に保存しました！`);
});
