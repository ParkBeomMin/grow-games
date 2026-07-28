/* 컴백 컨셉 4종과 판매량 기댓값 산식.
 *
 * "함수는 있는데 브라우저에선 못 가는" 기능을 다섯 번 겪은 저장소라, 여기서도
 * 실제 DOM(jsdom)에 페이지를 통째로 띄우고 Career._t에서 산식을 꺼내 검사한다
 * (tour-run-test.js와 같은 부트스트랩). 값을 옮겨 적은 테스트는 소스가 바뀌어도
 * 초록불이 뜨니, CONCEPTS·conceptOf·trendMul·expectedSales는 전부 _t로 노출된
 * 그대로를 호출해서 확인한다. */
"use strict";
const fs = require("fs");
const path = require("path");
const DIR = "/workspace/grow-games/beta/idol";
const { JSDOM } = require("/workspace/grow-games/tests/cloud/jsdom.js");

const PRELUDE = `
  window.fetch = () => Promise.reject(new Error("net off"));
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  localStorage.setItem("grow-auto-mini", "1");
`;

let html = fs.readFileSync(path.join(DIR, "index.html"), "utf8")
  .replace(/<script src="([^"]+)"><\/script>/g, (m0, src) => {
    const p = path.resolve(DIR, src);
    return fs.existsSync(p) ? `<script>\n${fs.readFileSync(p, "utf8")}\n</script>` : "";
  });
html = html.replace("</head>", `<script>${PRELUDE}</script></head>`);

const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "https://x.test/idol/" });
const w = dom.window;

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

const Career = w.Career || w.IdolCareer;
check(!!Career, "Career 모듈이 로드된다");
check(typeof Career?._t?.conceptOf === "function", "conceptOf가 _t로 노출된다");
if (!Career || !Career._t || !Career._t.conceptOf) { console.log("\n❌ 실패"); process.exit(1); }

const { CONCEPTS, conceptOf, trendMul, expectedSales } = Career._t;

// ---------- 1) CONCEPTS 4종 ----------
check(Array.isArray(CONCEPTS) && CONCEPTS.length === 4, `CONCEPTS가 4개다 (${CONCEPTS && CONCEPTS.length})`);
const ids = (CONCEPTS || []).map((c) => c.id).sort().join(",");
check(ids === "cool,emo,fierce,teen", `id가 정확히 cool/fierce/emo/teen이다 (${ids})`);

// ---------- 2) 가중치 합 ----------
const sumW = (c) => Object.values(c.w).reduce((a, b) => a + b, 0);
const byId = (id) => CONCEPTS.find((c) => c.id === id);
const near = (a, b) => Math.abs(a - b) < 1e-9;
check(near(sumW(byId("cool")), 1.8), `청량 가중치 합이 1.8이다 (${sumW(byId("cool"))})`);
check(near(sumW(byId("fierce")), 2.0), `강렬 가중치 합이 2.0이다 (${sumW(byId("fierce"))})`);
check(near(sumW(byId("emo")), 1.8), `감성 가중치 합이 1.8이다 (${sumW(byId("emo"))})`);
check(near(sumW(byId("teen")), 2.0), `하이틴 가중치 합이 2.0이다 (${sumW(byId("teen"))})`);

// ---------- 3~5) conceptOf 기본값·매칭·방어 ----------
check(conceptOf({}).id === "cool", "옛 세이브(concept 없음)는 청량 기본값이다");
check(conceptOf({ concept: "emo" }).id === "emo", "concept: emo면 감성을 고른다");
check(conceptOf({ concept: "없는거" }).id === "cool", "깨진 concept 값은 청량으로 방어된다");

// ---------- 6~10) trendMul ----------
const cool = byId("cool"), fierce = byId("fierce"), emo = byId("emo"), teen = byId("teen");
check(trendMul(emo, { hot: "emo", cold: "teen" }) === 1.18, "유행 컨셉이면 1.18배다");
check(trendMul(teen, { hot: "emo", cold: "teen" }) === 0.85, "식상 컨셉이면 0.85배다");
check(trendMul(cool, { hot: "emo", cold: "teen" }) === 1, "유행도 식상도 아니면 1배다");
check(trendMul(emo, { hot: "emo", cold: "emo" }) === 1, "같은 컨셉이 유행이자 식상이면 상쇄돼 1배다");
check(trendMul(cool, {}) === 1, "act에 hot/cold가 없는 옛 세이브는 1배다");
check(fierce.id === "fierce", "강렬 컨셉 객체를 정상적으로 참조한다"); // byId 자체 확인용 sanity

// ---------- 11~13) expectedSales ----------
const statsVocal = { vocal: 150, dance: 60, charm: 60, rap: 60 };
const statsDance = { vocal: 60, dance: 150, charm: 60, rap: 60 };
const sVocalEmo = expectedSales(statsVocal, emo, 0, 0);
const sVocalCool = expectedSales(statsVocal, cool, 0, 0);
check(sVocalEmo > sVocalCool, `보컬 150 스탯에서 감성이 청량보다 판매량이 높다 (감성 ${sVocalEmo} vs 청량 ${sVocalCool})`);

const sDanceCool = expectedSales(statsDance, cool, 0, 0);
const sDanceEmo = expectedSales(statsDance, emo, 0, 0);
check(sDanceCool > sDanceEmo, `댄스 150 스탯에서 청량이 감성보다 판매량이 높다 (청량 ${sDanceCool} vs 감성 ${sDanceEmo})`);

const lowFan = expectedSales(statsVocal, emo, 0, 0);
const midFan = expectedSales(statsVocal, emo, 1000, 0);
const highFan = expectedSales(statsVocal, emo, 5000, 0);
check(lowFan <= midFan && midFan <= highFan,
  `팬덤이 오르면 expectedSales가 단조 증가한다 (${lowFan} → ${midFan} → ${highFan})`);
check(lowFan < highFan, `팬덤 차이가 실제로 값을 움직인다 (${lowFan} vs ${highFan})`);

console.log(fail ? "\n❌ 실패" : "\n✅ 통과");
process.exit(fail ? 1 : 0);
