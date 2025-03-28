const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// モデルと実行ファイルのパス
const modelPath = path.join(__dirname, 'llama.cpp', 'models', 'qwen2.5-7b-instruct-q5_k_m.gguf');
const llamaPath = path.join(__dirname, 'llama.cpp', 'build', 'bin', 'llama-cli');

// プロンプトをファイルから読み込む
const prompt = fs.readFileSync('input_prompt.txt', 'utf-8');

// llama.cppの実行引数
const args = [
  '-m', modelPath,
  '-p', prompt,
  '-n', '512',
  '--color'
];

// 実行開始
console.log('🚀 Qwenに物語生成を依頼中...\n');

const llama = spawn(llamaPath, args);

llama.stdout.on('data', (data) => {
  process.stdout.write(data.toString());
});

llama.stderr.on('data', (data) => {
  console.error(`[stderr] ${data}`);
});

llama.on('close', (code) => {
  console.log(`\n🧠 出力完了（コード: ${code}）`);
});
