/* 8종이 실제로 로드되는지 — 스크립트 순서·문법·초기 렌더 오류를 잡아요.
 * tests/soccer/transfer-test.js의 부트스트랩을 그대로 씁니다 (src를 인라인해 순서를 살림). */
const fs = require("fs"), path = require("path");
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");
const ROOT = "/workspace/grow-games";
const GAMES = ["rookie", "soccer", "idol", "stock", "dev", "chef", "stream", "unicorn"];
const base = process.argv[2] === "root" ? "" : (process.argv[2] || "beta");
const PRELUDE = `
  window.fetch = () => Promise.reject(new Error("net off"));
  window.scrollTo = () => {};
  window.matchMedia = window.matchMedia || (() => ({ matches:false, addEventListener(){}, removeEventListener(){} }));
  window.__errs = [];
  window.addEventListener("error", (e) => window.__errs.push(String(e.message || e.error)));
`;
let bad = 0;
for (const g of GAMES) {
  const dir = path.join(ROOT, base, g);
  let html = fs.readFileSync(path.join(dir, "index.html"), "utf8")
    .replace(/<script[^>]*src="https?:[^"]*"[^>]*><\/script>/g, "")
    .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
      const p = path.resolve(dir, src.split("?")[0]);
      return fs.existsSync(p) ? `<script>\n${fs.readFileSync(p, "utf8")}\n</script>` : "";
    });
  html = html.replace("</head>", `<script>${PRELUDE}</script></head>`);
  let err = null;
  try {
    const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://x/" });
    const e = dom.window.__errs || [];
    if (e.length) err = e[0];
    dom.window.close();
  } catch (e) { err = e.message; }
  if (err) { bad++; console.log(`❌ ${base || "상용"}/${g}\n     ${err}`); }
  else console.log(`✅ ${base || "상용"}/${g}`);
}
process.exit(bad ? 1 : 0);
