// dev/b：把 marked + highlight.js 打包为浏览器 vendor 包（离线可用）
import { build } from 'esbuild';
import fs from 'node:fs';

fs.mkdirSync('public/vendor', { recursive: true });

await build({
  stdin: {
    contents:
      "import { marked } from 'marked'; import hljs from 'highlight.js/lib/common'; window.marked = marked; window.hljs = hljs;",
    resolveDir: process.cwd(),
  },
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2019',
  outfile: 'public/vendor/markdown.js',
});

fs.copyFileSync('node_modules/highlight.js/styles/github.css', 'public/vendor/github.css');
console.log('vendor 构建完成: public/vendor/markdown.js + github.css');
