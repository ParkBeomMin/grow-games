# 클라우드 세이브 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** localStorage에만 있던 세이브를 Supabase에 자동 백업하고, 연동 코드 하나로 여러 기기가 같은 기록을 오가며 쓸 수 있게 한다.

**Architecture:** 기기가 128비트 토큰을 만들어 localStorage에 두고, 서버에는 그 SHA-256 해시만 저장한다. 세이브는 기기가 아니라 **계정**에 매달려 여러 기기가 공유한다. 네 테이블 모두 RLS로 잠그고 `security definer` 함수 다섯 개로만 접근한다. 클라이언트는 새 공용 파일 `cloud.js` 하나이며, 게임 코드는 `Cloud.mark()`/`Cloud.touch()` 호출만 추가한다.

**Tech Stack:** 바닐라 JS (빌드 없음), Supabase PostgREST RPC, PostgreSQL `pgcrypto`, jsdom(검증용)

## Global Constraints

- 설계 근거는 `docs/superpowers/specs/2026-07-27-cloud-save-design.md`. 충돌 시 스펙이 우선한다.
- **베타에만 작업한다.** `beta/` 밖(루트) 파일은 이번 계획에서 절대 건드리지 않는다.
- 빌드 도구·번들러·npm 의존성을 추가하지 않는다. 브라우저가 직접 로드하는 파일만 쓴다.
- 모든 네트워크 실패를 삼킨다. 게임 진행을 막는 코드를 넣지 않는다.
- 주석과 사용자 문구는 한국어. 기존 파일의 "~요" 말투를 따른다.
- Supabase 접속 정보는 `beta/match.js:28-30`의 상수를 재사용한다. 새로 하드코딩하지 않는다.
- service_role 키는 Doppler `GROW_GAMES_SUPABASE_SERVICE_ROLE_KEY`에서만 읽고, **어떤 파일에도 쓰지 않는다.**
- 기기 시계(`Date.now()`)를 동기화 판정에 쓰지 않는다. 판정은 서버 `updated`와 로컬 `dirty` 플래그로만 한다.
- 커밋 메시지는 한국어, 끝에 `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>` 포함.

## File Structure

| 파일 | 책임 |
|---|---|
| `scratchpad/cloud-schema.sql` (임시, 커밋 안 함) | 테이블·함수 DDL. Task 1에서 적용 후 스펙에 반영 |
| `beta/cloud.js` (신규) | 토큰 관리, RPC 호출, 동기화 판정, 모달 UI, 토스트 |
| `beta/base.css` (수정) | 동기화 배지·모달 전용 스타일 |
| `beta/<game>/index.html` × 8 (수정) | 버튼 1줄 + 스크립트 1줄 |
| `beta/<game>/game.js` × 8 (수정) | `Cloud.init` 호출 + `Cloud.touch()` |
| `beta/<game>/career.js` × 7 (수정) | 은퇴·환생·시즌종료에 `Cloud.mark()` |
| `beta/help.js` 사용 7종 (수정) | 도움말 항목 |
| `scratchpad/cloud-test.js` (임시) | jsdom 검증 |

---

### Task 1: Supabase 스키마와 함수

**Files:**
- Create: `/tmp/claude-0/-workspace/e471dffd-68a9-4271-9b48-58c8b140bbbb/scratchpad/cloud-schema.sql`

**Interfaces:**
- Produces: RPC 엔드포인트 `cloud_push` · `cloud_meta` · `cloud_pull` · `cloud_issue` · `cloud_claim`
  - `cloud_push(p_token text, p_game text, p_data jsonb) → timestamptz`
  - `cloud_meta(p_token text) → table(game text, updated timestamptz)`
  - `cloud_pull(p_token text, p_game text) → table(game text, data jsonb, updated timestamptz)`
  - `cloud_issue(p_token text) → text` (코드 원문, 1회만)
  - `cloud_claim(p_token text, p_code text) → boolean`

- [ ] **Step 1: DDL 파일 작성**

```sql
-- 클라우드 세이브 스키마
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.cloud_account (
  id      uuid primary key default gen_random_uuid(),
  created timestamptz not null default now()
);

create table if not exists public.cloud_device (
  token_hash text primary key,
  account_id uuid not null references public.cloud_account(id) on delete cascade,
  created    timestamptz not null default now(),
  seen       timestamptz not null default now()
);

create table if not exists public.cloud_save (
  account_id uuid not null references public.cloud_account(id) on delete cascade,
  game       text not null,
  data       jsonb not null,
  updated    timestamptz not null default now(),
  primary key (account_id, game)
);

create table if not exists public.cloud_code (
  code_hash  text primary key,
  account_id uuid not null references public.cloud_account(id) on delete cascade,
  created    timestamptz not null default now()
);

alter table public.cloud_account enable row level security;
alter table public.cloud_device  enable row level security;
alter table public.cloud_save    enable row level security;
alter table public.cloud_code    enable row level security;
-- 정책을 만들지 않는다 → anon은 직접 접근 불가. 아래 함수로만 접근한다.

-- 토큰 해시로 계정을 찾고, 없으면 만든다.
create or replace function public.cloud_account_of(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text := encode(digest(p_token, 'sha256'), 'hex');
  v_acc  uuid;
begin
  if p_token is null or length(p_token) < 16 then
    raise exception '토큰이 올바르지 않아요';
  end if;
  select account_id into v_acc from public.cloud_device where token_hash = v_hash;
  if v_acc is null then
    insert into public.cloud_account default values returning id into v_acc;
    insert into public.cloud_device(token_hash, account_id) values (v_hash, v_acc);
  else
    update public.cloud_device set seen = now() where token_hash = v_hash;
  end if;
  return v_acc;
end;
$$;

create or replace function public.cloud_push(p_token text, p_game text, p_data jsonb)
returns timestamptz
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_acc uuid := public.cloud_account_of(p_token);
  v_at  timestamptz;
begin
  insert into public.cloud_save(account_id, game, data, updated)
  values (v_acc, p_game, p_data, now())
  on conflict (account_id, game)
  do update set data = excluded.data, updated = now()
  returning updated into v_at;
  return v_at;
end;
$$;

create or replace function public.cloud_meta(p_token text)
returns table(game text, updated timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_acc uuid := public.cloud_account_of(p_token);
begin
  return query
    select s.game, s.updated from public.cloud_save s where s.account_id = v_acc;
end;
$$;

create or replace function public.cloud_pull(p_token text, p_game text default null)
returns table(game text, data jsonb, updated timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_acc uuid := public.cloud_account_of(p_token);
begin
  return query
    select s.game, s.data, s.updated
    from public.cloud_save s
    where s.account_id = v_acc
      and (p_game is null or s.game = p_game);
end;
$$;

-- 코드 발급 — 기존 코드는 무효가 된다. 원문은 여기서 한 번만 나간다.
create or replace function public.cloud_issue(p_token text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_acc  uuid := public.cloud_account_of(p_token);
  v_abc  text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';  -- 0 O 1 I L 제외
  v_code text := '';
  i int;
begin
  delete from public.cloud_code where account_id = v_acc;
  for i in 1..24 loop
    v_code := v_code || substr(v_abc, 1 + floor(random() * length(v_abc))::int, 1);
  end loop;
  insert into public.cloud_code(code_hash, account_id)
  values (encode(digest(v_code, 'sha256'), 'hex'), v_acc);
  -- 4자씩 하이픈으로 끊어 돌려준다
  return regexp_replace(v_code, '(.{4})(?=.)', '\1-', 'g');
end;
$$;

-- 코드로 이 기기를 그 계정에 연결한다. 일회용.
create or replace function public.cloud_claim(p_token text, p_code text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_clean text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_hash  text := encode(digest(v_clean, 'sha256'), 'hex');
  v_acc   uuid;
  v_dev   text := encode(digest(p_token, 'sha256'), 'hex');
begin
  select account_id into v_acc from public.cloud_code where code_hash = v_hash;
  if v_acc is null then
    return false;
  end if;
  insert into public.cloud_device(token_hash, account_id)
  values (v_dev, v_acc)
  on conflict (token_hash) do update set account_id = excluded.account_id, seen = now();
  delete from public.cloud_code where code_hash = v_hash;
  return true;
end;
$$;

revoke all on function public.cloud_account_of(text) from anon, authenticated;
grant execute on function public.cloud_push(text, text, jsonb)   to anon;
grant execute on function public.cloud_meta(text)                to anon;
grant execute on function public.cloud_pull(text, text)          to anon;
grant execute on function public.cloud_issue(text)               to anon;
grant execute on function public.cloud_claim(text, text)         to anon;
```

- [ ] **Step 2: Supabase에 적용**

Doppler의 service_role 키로 실행한다. 키를 화면에 출력하지 않는다.

```bash
cd /workspace/grow-games
SQL=$(cat /tmp/claude-0/-workspace/e471dffd-68a9-4271-9b48-58c8b140bbbb/scratchpad/cloud-schema.sql)
doppler run -- bash -c 'curl -s -X POST \
  "$GROW_GAMES_SUPABASE_URL/rest/v1/rpc/exec_sql" \
  -H "apikey: $GROW_GAMES_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $GROW_GAMES_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" -d @-' <<< "$(jq -Rs '{query: .}' <<< "$SQL")"
```

`exec_sql` RPC가 없으면 실패한다. 그 경우 Supabase Management API를 쓴다:

```bash
doppler run -- bash -c 'curl -s -X POST \
  "$GROW_GAMES_SUPABASE_URL/pg/query" \
  -H "apikey: $GROW_GAMES_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" -d @-' <<< "$(jq -Rs '{query: .}' <<< "$SQL")"
```

둘 다 실패하면 **Step 2를 중단하고 사용자에게 SQL Editor 붙여넣기를 요청한다.**
DDL 적용 경로는 환경마다 달라 추측으로 반복 시도하지 않는다.

- [ ] **Step 3: RPC가 실제로 도는지 확인**

```bash
cd /workspace/grow-games
doppler run -- bash -c '
Q() { curl -s -X POST "$GROW_GAMES_SUPABASE_URL/rest/v1/rpc/$1" \
  -H "apikey: $GROW_GAMES_SUPABASE_PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $GROW_GAMES_SUPABASE_PUBLISHABLE_KEY" \
  -H "Content-Type: application/json" -d "$2"; echo; }
T=testtoken-aaaaaaaaaaaaaaaa
U=testtoken-bbbbbbbbbbbbbbbb
echo "1) push:";  Q cloud_push  "{\"p_token\":\"$T\",\"p_game\":\"beta:rookie\",\"p_data\":{\"n\":1}}"
echo "2) meta:";  Q cloud_meta  "{\"p_token\":\"$T\"}"
echo "3) issue:"; CODE=$(Q cloud_issue "{\"p_token\":\"$T\"}" | tr -d "\"" ); echo "$CODE"
echo "4) claim(정상):"; Q cloud_claim "{\"p_token\":\"$U\",\"p_code\":\"$CODE\"}"
echo "5) claim(재사용):"; Q cloud_claim "{\"p_token\":\"$U\",\"p_code\":\"$CODE\"}"
echo "6) B에서 pull:";   Q cloud_pull  "{\"p_token\":\"$U\"}"
'
```

Expected:
- 1) 타임스탬프 문자열
- 2) `[{"game":"beta:rookie","updated":"..."}]`
- 3) `XXXX-XXXX-XXXX-XXXX-XXXX-XXXX` 형태
- 4) `true`
- 5) `false` ← 일회용이 지켜짐
- 6) A가 넣은 `{"n":1}`이 보임 ← 계정 공유가 지켜짐

- [ ] **Step 4: RLS 잠금 확인**

```bash
cd /workspace/grow-games
doppler run -- bash -c '
for t in cloud_account cloud_device cloud_save cloud_code; do
  printf "%-16s " "$t"
  curl -s "$GROW_GAMES_SUPABASE_URL/rest/v1/$t?select=*&limit=1" \
    -H "apikey: $GROW_GAMES_SUPABASE_PUBLISHABLE_KEY" \
    -H "Authorization: Bearer $GROW_GAMES_SUPABASE_PUBLISHABLE_KEY"
  echo
done'
```

Expected: 네 줄 모두 빈 배열 `[]` 또는 권한 오류. **행 내용이 보이면 실패다** — 정책을 다시 확인한다.

- [ ] **Step 5: 시험 데이터 정리**

```bash
cd /workspace/grow-games
doppler run -- bash -c 'curl -s -X DELETE \
  "$GROW_GAMES_SUPABASE_URL/rest/v1/cloud_account?id=neq.00000000-0000-0000-0000-000000000000" \
  -H "apikey: $GROW_GAMES_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $GROW_GAMES_SUPABASE_SERVICE_ROLE_KEY" \
  -H "Prefer: return=minimal"'
```

Expected: 빈 응답. 이후 Step 4를 다시 돌려 `[]`인지 확인한다.

- [ ] **Step 6: 스펙에 최종 DDL 반영하고 커밋**

`docs/superpowers/specs/2026-07-27-cloud-save-design.md`의 4.1·4.2절을 실제 적용한 DDL로 갱신한다
(스펙에 `cloud_account_of` 헬퍼가 빠져 있으므로 추가).

```bash
cd /workspace/grow-games
git add docs/superpowers/specs/2026-07-27-cloud-save-design.md
git commit -m "$(cat <<'EOF'
docs: 클라우드 세이브 — 실제 적용한 DDL을 스펙에 반영

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `cloud.js` — 토큰과 전송

**Files:**
- Create: `beta/cloud.js`
- Test: `/tmp/claude-0/-workspace/e471dffd-68a9-4271-9b48-58c8b140bbbb/scratchpad/cloud-test.js`

**Interfaces:**
- Consumes: Task 1의 RPC 다섯 개
- Produces:
  - `window.Cloud.init(game: string): void`
  - `window.Cloud.touch(): void`
  - `window.Cloud.mark(): void`
  - `window.Cloud._t` (테스트용 내부 노출: `{ token(), keysOf(game), collect(game), apply(game, obj), rpc(fn, body) }`)

- [ ] **Step 1: 실패하는 테스트 작성**

`scratchpad/cloud-test.js`:

```js
/* cloud.js 검증 — jsdom에서 실제 브라우저처럼 로드해 돌린다. */
"use strict";
const fs = require("fs");
const SP = "/tmp/claude-0/-workspace/e471dffd-68a9-4271-9b48-58c8b140bbbb/scratchpad";
const { JSDOM } = require(SP + "/node_modules/jsdom");

const dom = new JSDOM("<!doctype html><body></body>", { runScripts: "outside-only", url: "https://x.test/rookie/" });
const { window } = dom;
window.GROW_ENV = { beta: true };
const calls = [];
window.fetch = (url, opt) => {
  calls.push({ url, body: JSON.parse(opt.body) });
  return Promise.resolve({ ok: true, json: () => Promise.resolve("2026-07-27T00:00:00Z") });
};
window.eval(fs.readFileSync("/workspace/grow-games/beta/cloud.js", "utf8"));

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const T = window.Cloud._t;

// 토큰
const a = T.token(), b = T.token();
check(a === b, "토큰은 한 번 만들면 유지된다");
check(a.length >= 32, `토큰이 128비트 이상 (${a.length}자)`);

// 게임별 키
const keys = T.keysOf("rookie");
check(keys.includes("rookie-save-v1"), "루키 세이브 키 포함");
check(keys.includes("rookie-save-v1-slots"), "슬롯 키 포함");
check(keys.includes("rookie-save-v1-legacy"), "유산 키 포함");
check(!keys.includes("grow-hof-v1"), "명예의 전당은 게임 키에 안 들어간다 (_shared로 분리)");
check(!keys.includes("grow-player-id"), "기기 설정은 동기화하지 않는다");
check(T.keysOf("unicorn").includes("unicorn-founded"), "유니콘 전용 키 포함");

// 수집·복원 왕복
window.localStorage.setItem("rookie-save-v1", JSON.stringify({ n: 1 }));
const got = T.collect("rookie");
check(got["rookie-save-v1"] === JSON.stringify({ n: 1 }), "collect가 값을 담는다");
window.localStorage.removeItem("rookie-save-v1");
T.apply("rookie", got);
check(window.localStorage.getItem("rookie-save-v1") === JSON.stringify({ n: 1 }), "apply가 되돌려 쓴다");

// 베타 접두어
window.Cloud.init("rookie");
window.Cloud.mark();
setTimeout(() => {
  const push = calls.find((c) => /cloud_push/.test(c.url));
  check(!!push, "mark()가 push를 부른다");
  check(push && push.body.p_game === "beta:rookie", `베타는 game에 접두어 (${push && push.body.p_game})`);
  console.log(fail ? "\n❌ 실패" : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
}, 50);
```

- [ ] **Step 2: 실패 확인**

Run: `cd /workspace/grow-games && node /tmp/claude-0/-workspace/e471dffd-68a9-4271-9b48-58c8b140bbbb/scratchpad/cloud-test.js`
Expected: FAIL — `ENOENT ... beta/cloud.js`

- [ ] **Step 3: `beta/cloud.js` 작성**

```js
/* ☁️ 클라우드 세이브 — 기기 토큰으로 세이브를 서버에 백업하고 여러 기기가 공유해요.
 * 설계: docs/superpowers/specs/2026-07-27-cloud-save-design.md
 *
 * localStorage가 항상 주(主)예요. 서버는 사본이고, 실패하면 조용히 넘어가요.
 * 게임은 Cloud.init(게임) 한 번, 저장할 때 Cloud.touch(), 큰 순간에 Cloud.mark()만 부르면 돼요.
 */
(function () {
  "use strict";

  var URL_ = "https://dlbpvzgwwcgphlhymncx.supabase.co";
  var KEY_ = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsYnB2emd3d2NncGhsaHltbmN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3ODA3MTMsImV4cCI6MjEwMDM1NjcxM30.tyLMO8o_i5OTmKaRudFd5LATDjmjVzL8M2NM_4EoeBc";

  var TOKEN_KEY = "grow-cloud-token";
  var PUSH_GAP = 2 * 60 * 1000;   // 2분

  // 게임별 저장 키 (beta/<game>/game.js의 상수와 일치해야 해요)
  var SAVE = {
    rookie: "rookie-save-v1", idol: "trainee-save-v1", stock: "investor-save-v1",
    dev: "devgrow-save-v1", chef: "chef-save-v1", stream: "streamer-save-v1",
    soccer: "winger-save-v1", unicorn: "unicorn-save-v1",
  };
  var BATTLE = {
    rookie: "grow-battle-v1", idol: "grow-battle-idol-v1", stock: "grow-battle-stock-v1",
    dev: "grow-battle-dev-v1", chef: "grow-battle-chef-v1", stream: "grow-battle-stream-v1",
    soccer: "grow-battle-soccer-v1",
  };
  var SHARED_KEY = "grow-hof-v1";   // 8종이 함께 쓰는 명예의 전당
  var SHARED_GAME = "_shared";

  function keysOf(game) {
    var out = [];
    var s = SAVE[game];
    if (!s) return out;
    out.push(s);
    if (game === "unicorn") {
      out.push("unicorn-founded");
    } else {
      out.push(s + "-slots", s + "-legacy");
    }
    if (BATTLE[game]) out.push(BATTLE[game]);
    return out;
  }

  // 128비트 무작위. crypto가 없으면 Math.random으로 떨어져요 (아주 오래된 브라우저)
  function token() {
    var t = null;
    try { t = localStorage.getItem(TOKEN_KEY); } catch (e) { return "nostorage"; }
    if (t) return t;
    var raw = "";
    if (window.crypto && window.crypto.getRandomValues) {
      var a = new Uint8Array(16);
      window.crypto.getRandomValues(a);
      for (var i = 0; i < a.length; i++) raw += ("0" + a[i].toString(16)).slice(-2);
    } else {
      for (var j = 0; j < 4; j++) raw += Math.random().toString(16).slice(2, 10);
    }
    try { localStorage.setItem(TOKEN_KEY, raw); } catch (e) {}
    return raw;
  }

  var isBeta = !!(window.GROW_ENV && window.GROW_ENV.beta);
  var tag = function (game) { return (isBeta ? "beta:" : "") + game; };

  function rpc(fn, body) {
    return fetch(URL_ + "/rest/v1/rpc/" + fn, {
      method: "POST",
      headers: { apikey: KEY_, Authorization: "Bearer " + KEY_, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).then(function (r) {
      if (!r.ok) throw new Error("rpc " + fn + " " + r.status);
      return r.json();
    });
  }

  function collect(game) {
    var out = {};
    keysOf(game).forEach(function (k) {
      var v = null;
      try { v = localStorage.getItem(k); } catch (e) {}
      if (v !== null) out[k] = v;
    });
    return out;
  }

  function apply(game, obj) {
    keysOf(game).forEach(function (k) {
      try {
        if (Object.prototype.hasOwnProperty.call(obj, k)) localStorage.setItem(k, obj[k]);
        else localStorage.removeItem(k);
      } catch (e) {}
    });
  }

  var cur = null;           // 현재 게임 이름
  var lastPush = 0;
  var dirtyKey = function (g) { return "grow-cloud-dirty-" + g; };
  var syncKey = function (g) { return "grow-cloud-synced-" + g; };
  var get = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var set = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };

  function push(game) {
    if (!game || !SAVE[game]) return Promise.resolve();
    lastPush = Date.now();
    return rpc("cloud_push", { p_token: token(), p_game: tag(game), p_data: collect(game) })
      .then(function (at) {
        set(syncKey(game), String(at));
        set(dirtyKey(game), "0");
        pushShared();
      })
      .catch(function () { /* 조용히 넘어가요 */ });
  }

  function pushShared() {
    var v = get(SHARED_KEY);
    if (v === null) return;
    rpc("cloud_push", { p_token: token(), p_game: tag(SHARED_GAME), p_data: { "grow-hof-v1": v } })
      .catch(function () {});
  }

  function touch() {
    if (!cur) return;
    set(dirtyKey(cur), "1");
    if (Date.now() - lastPush > PUSH_GAP) push(cur);
  }

  function mark() { if (cur) push(cur); }

  function init(game) {
    cur = game;
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden" && get(dirtyKey(game)) === "1") push(game);
    });
  }

  window.Cloud = { init: init, touch: touch, mark: mark };
  window.Cloud._t = { token: token, keysOf: keysOf, collect: collect, apply: apply, rpc: rpc, tag: tag };
})();
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd /workspace/grow-games && node /tmp/claude-0/-workspace/e471dffd-68a9-4271-9b48-58c8b140bbbb/scratchpad/cloud-test.js`
Expected: 모든 줄 ✅, 마지막 `✅ 통과`

- [ ] **Step 5: 커밋**

```bash
cd /workspace/grow-games
git add beta/cloud.js
git commit -m "$(cat <<'EOF'
feat(베타): 클라우드 세이브 기반 — 기기 토큰과 전송

localStorage가 주(主)이고 서버는 사본이에요. 실패는 전부 삼켜서
게임 진행을 막지 않아요. 명예의 전당은 8종이 공유하는 키라
_shared 행으로 따로 올려요.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 동기화 판정과 자동 수신

**Files:**
- Modify: `beta/cloud.js`
- Test: `/tmp/claude-0/-workspace/e471dffd-68a9-4271-9b48-58c8b140bbbb/scratchpad/cloud-sync-test.js`

**Interfaces:**
- Consumes: Task 2의 `Cloud._t`, `push()`
- Produces: `Cloud._t.decide(game, serverUpdated) → "pull" | "push" | "conflict" | "none"`

- [ ] **Step 1: 실패하는 테스트 작성**

`scratchpad/cloud-sync-test.js`:

```js
/* 5.3절 4분기 판정 검증 */
"use strict";
const fs = require("fs");
const SP = "/tmp/claude-0/-workspace/e471dffd-68a9-4271-9b48-58c8b140bbbb/scratchpad";
const { JSDOM } = require(SP + "/node_modules/jsdom");
const dom = new JSDOM("<!doctype html><body></body>", { runScripts: "outside-only", url: "https://x.test/rookie/" });
const { window } = dom;
window.GROW_ENV = { beta: true };
window.fetch = () => Promise.reject(new Error("off"));
window.eval(fs.readFileSync("/workspace/grow-games/beta/cloud.js", "utf8"));

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const T = window.Cloud._t;
const LS = window.localStorage;

const OLD = "2026-07-27T00:00:00Z", NEW = "2026-07-27T01:00:00Z";
const setup = (dirty, synced) => {
  LS.setItem("grow-cloud-dirty-rookie", dirty ? "1" : "0");
  if (synced) LS.setItem("grow-cloud-synced-rookie", synced); else LS.removeItem("grow-cloud-synced-rookie");
};

setup(false, OLD); check(T.decide("rookie", NEW) === "pull",     "안 건드림 + 서버 최신 → 자동 수신");
setup(false, OLD); check(T.decide("rookie", OLD) === "none",     "안 건드림 + 서버 같음 → 아무것도 안 함");
setup(true,  OLD); check(T.decide("rookie", OLD) === "push",     "건드림 + 서버 같음 → 올림");
setup(true,  OLD); check(T.decide("rookie", NEW) === "conflict", "건드림 + 서버 최신 → 충돌");
setup(false, null); check(T.decide("rookie", NEW) === "pull",    "첫 동기화 + 서버에 기록 있음 → 수신");
setup(true,  null); check(T.decide("rookie", null) === "push",   "서버에 기록 없음 → 올림");
setup(false, null); check(T.decide("rookie", null) === "none",   "양쪽 다 없음 → 아무것도 안 함");

console.log(fail ? "\n❌ 실패" : "\n✅ 통과");
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: 실패 확인**

Run: `cd /workspace/grow-games && node /tmp/claude-0/-workspace/e471dffd-68a9-4271-9b48-58c8b140bbbb/scratchpad/cloud-sync-test.js`
Expected: FAIL — `T.decide is not a function`

- [ ] **Step 3: `decide` 구현**

`beta/cloud.js`의 `function mark() { ... }` 바로 다음에 추가:

```js
  /* 5.3절 판정 — 기기 시계를 쓰지 않아요.
   * dirty(내가 안 올린 변경이 있나) × 서버가 더 최신인가, 네 갈래예요. */
  function decide(game, serverUpdated) {
    var dirty = get(dirtyKey(game)) === "1";
    var synced = get(syncKey(game));
    var remoteNewer = !!serverUpdated && (!synced || Date.parse(serverUpdated) > Date.parse(synced));
    if (dirty && remoteNewer) return "conflict";
    if (dirty) return "push";
    if (remoteNewer) return "pull";
    return "none";
  }
```

그리고 `window.Cloud._t` 객체에 `decide: decide,`를 추가한다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd /workspace/grow-games && node /tmp/claude-0/-workspace/e471dffd-68a9-4271-9b48-58c8b140bbbb/scratchpad/cloud-sync-test.js`
Expected: 7줄 모두 ✅

- [ ] **Step 5: `init`에서 판정을 실제로 돌리게 연결**

`beta/cloud.js`의 `init`을 아래로 교체한다:

```js
  function init(game) {
    cur = game;
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden" && get(dirtyKey(game)) === "1") push(game);
    });
    // 타이틀 진입 시 서버 상태만 가볍게 확인해요
    rpc("cloud_meta", { p_token: token() }).then(function (rows) {
      var mine = null;
      (rows || []).forEach(function (r) { if (r.game === tag(game)) mine = r.updated; });
      var act = decide(game, mine);
      if (act === "push") push(game);
      else if (act === "pull") pullAndApply(game);
      else if (act === "conflict") window.Cloud.onConflict(game, mine);
    }).catch(function () {});
  }

  function pullAndApply(game) {
    return rpc("cloud_pull", { p_token: token(), p_game: tag(game) }).then(function (rows) {
      if (!rows || !rows.length) return;
      apply(game, rows[0].data);
      set(syncKey(game), String(rows[0].updated));
      set(dirtyKey(game), "0");
      toast("☁️ 다른 기기 기록을 불러왔어요");
      setTimeout(function () { location.reload(); }, 900);
    }).catch(function () {});
  }

  // 충돌 화면은 Task 4에서 채워요. 그전까지는 아무것도 안 해요.
  function onConflict() {}
  function toast(msg) { if (window.Cloud._toast) window.Cloud._toast(msg); }
```

`window.Cloud`에 `onConflict: onConflict, _pull: pullAndApply,`를 추가한다.

- [ ] **Step 6: 두 테스트 모두 통과 확인**

```bash
cd /workspace/grow-games
node /tmp/claude-0/-workspace/e471dffd-68a9-4271-9b48-58c8b140bbbb/scratchpad/cloud-test.js
node /tmp/claude-0/-workspace/e471dffd-68a9-4271-9b48-58c8b140bbbb/scratchpad/cloud-sync-test.js
```
Expected: 둘 다 `✅ 통과`

- [ ] **Step 7: 커밋**

```bash
cd /workspace/grow-games
git add beta/cloud.js
git commit -m "$(cat <<'EOF'
feat(베타): 클라우드 세이브 동기화 판정

기기 시계를 안 믿고, dirty 플래그와 서버 updated로만 판정해요.
안 건드렸으면 자동 수신, 건드렸으면 충돌 확인으로 갈라져요.
판정은 게임별로 따로 해서 한 게임 충돌이 나머지를 막지 않아요.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 모달 · 토스트 · 동기화 배지 UI

**Files:**
- Modify: `beta/cloud.js`, `beta/base.css`
- Test: `/tmp/claude-0/-workspace/e471dffd-68a9-4271-9b48-58c8b140bbbb/scratchpad/cloud-ui-test.js`

**Interfaces:**
- Consumes: Task 3의 `decide`, `pullAndApply`, `push`
- Produces: `Cloud.openModal()`, `Cloud._toast(msg)`, `Cloud.onConflict(game, updated)`

- [ ] **Step 1: 실패하는 테스트 작성**

`scratchpad/cloud-ui-test.js`:

```js
"use strict";
const fs = require("fs");
const SP = "/tmp/claude-0/-workspace/e471dffd-68a9-4271-9b48-58c8b140bbbb/scratchpad";
const { JSDOM } = require(SP + "/node_modules/jsdom");
const dom = new JSDOM("<!doctype html><body></body>", { runScripts: "outside-only", url: "https://x.test/rookie/" });
const { window } = dom;
window.GROW_ENV = { beta: true };
let copied = null;
window.navigator.clipboard = { writeText: (t) => { copied = t; return Promise.resolve(); } };
window.fetch = (url) => Promise.resolve({
  ok: true,
  json: () => Promise.resolve(/cloud_issue/.test(url) ? "ABCD-EFGH-JKMN-PQRS-TUVW-XYZ2" : []),
});
window.eval(fs.readFileSync("/workspace/grow-games/beta/cloud.js", "utf8"));

let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };
const $ = (s) => window.document.querySelector(s);

window.Cloud.init("rookie");
window.Cloud.openModal();
check(!!$(".cloud-modal"), "모달이 열린다");
check(!!$("#cloud-issue"), "코드 발급 버튼이 있다");
check(!!$("#cloud-code-input"), "코드 입력칸이 있다");

$("#cloud-issue").click();
setTimeout(() => {
  check(copied === "ABCD-EFGH-JKMN-PQRS-TUVW-XYZ2", `클립보드에 복사됨 (${copied})`);
  check(/ABCD-EFGH/.test($(".cloud-modal").textContent), "코드가 화면에도 보인다");

  window.Cloud._toast("테스트");
  check(!!$(".cloud-toast"), "토스트가 뜬다");

  $(".cloud-close").click();
  check(!$(".cloud-modal"), "닫기로 사라진다");

  console.log(fail ? "\n❌ 실패" : "\n✅ 통과");
  process.exit(fail ? 1 : 0);
}, 30);
```

- [ ] **Step 2: 실패 확인**

Run: `cd /workspace/grow-games && node /tmp/claude-0/-workspace/e471dffd-68a9-4271-9b48-58c8b140bbbb/scratchpad/cloud-ui-test.js`
Expected: FAIL — `Cloud.openModal is not a function`

- [ ] **Step 3: CSS 추가**

`beta/base.css`의 `.tm-legend-tip` 줄 바로 다음에 추가:

```css
/* ☁️ 클라우드 세이브 — 동기화 배지와 연동 모달 */
.cloud-toast {
  position: fixed; right: 10px; top: 10px; z-index: 9998;
  background: rgba(10, 15, 12, .88); border: 1px solid var(--line);
  color: var(--cream); font-size: .74rem; padding: 7px 12px; border-radius: 99px;
  box-shadow: 0 2px 10px rgba(0,0,0,.4); animation: cloudin .25s ease;
}
@keyframes cloudin { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .cloud-toast { animation: none; } }

.cloud-modal { width: 420px; max-width: 92vw; text-align: left; }
.cloud-modal p { font-size: .82rem; color: var(--dim); line-height: 1.65; margin-bottom: 12px; }
.cloud-code {
  display: block; font-family: ui-monospace, monospace; font-size: .95rem; color: var(--accent);
  background: rgba(0,0,0,.3); border: 1px dashed var(--line); border-radius: 10px;
  padding: 10px; margin: 10px 0; text-align: center; word-break: break-all; user-select: all;
}
.cloud-sep { border: 0; border-top: 1px solid var(--line); margin: 16px 0; }
.cloud-row { display: flex; gap: 8px; }
.cloud-row input {
  flex: 1; min-width: 0; background: var(--bg2); border: 2px solid var(--line);
  border-radius: 10px; color: var(--text); font-size: .9rem; padding: 10px;
}
.cloud-row .btn { width: auto; margin: 0; padding: 10px 14px; white-space: nowrap; }
.cloud-pick { margin: 10px 0; font-size: .82rem; color: var(--text); }
.cloud-pick label { display: block; padding: 6px 0; cursor: pointer; }
```

- [ ] **Step 4: 모달·토스트 구현**

`beta/cloud.js`의 `window.Cloud = {...}` 줄 **앞에** 추가:

```js
  var esc = function (s) { return String(s).replace(/[&<>]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); };

  function _toast(msg, ms) {
    var old = document.querySelector(".cloud-toast");
    if (old) old.remove();
    var el = document.createElement("div");
    el.className = "cloud-toast";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, ms || 1800);
  }

  function closeModal() {
    var ov = document.querySelector(".cloud-overlay");
    if (ov) ov.remove();
  }

  function shell(inner) {
    closeModal();
    var ov = document.createElement("div");
    ov.className = "av-overlay cloud-overlay";
    ov.innerHTML = '<div class="av-modal cloud-modal">' + inner +
      '<div class="av-actions"><button class="btn btn-ghost cloud-close">닫기</button></div></div>';
    ov.addEventListener("click", function (e) { if (e.target === ov) closeModal(); });
    document.body.appendChild(ov);
    ov.querySelector(".cloud-close").onclick = closeModal;
    return ov;
  }

  function openModal() {
    var issued = get("grow-cloud-issued") === "1";
    var ov = shell(
      '<p class="av-title">🔗 기록 연동</p>' +
      '<p>이 기기의 기록은 자동으로 백업되고 있어요.<br/>' +
      '다른 기기에서도 이어서 하려면 연동 코드를 받아 그 기기에 붙여넣으세요.<br/>' +
      '한 번 연결해두면 8개 게임 기록이 양쪽에서 자동으로 맞춰져요.</p>' +
      '<button class="btn btn-primary" id="cloud-issue">' +
        (issued ? "🔄 새 코드 발급 (지금 코드는 무효가 돼요)" : "📋 계정 연동 코드 복사하기") +
      '</button>' +
      '<div id="cloud-out"></div>' +
      '<hr class="cloud-sep"/>' +
      '<p>다른 기기에서 쓰던 코드가 있나요?</p>' +
      '<div class="cloud-row">' +
        '<input id="cloud-code-input" placeholder="코드를 붙여넣으세요" autocomplete="off"/>' +
        '<button class="btn btn-ghost" id="cloud-claim">불러오기</button>' +
      '</div><div id="cloud-msg"></div>'
    );

    ov.querySelector("#cloud-issue").onclick = function () {
      var btn = this;
      btn.disabled = true;
      rpc("cloud_issue", { p_token: token() }).then(function (code) {
        set("grow-cloud-issued", "1");
        ov.querySelector("#cloud-out").innerHTML =
          '<code class="cloud-code">' + esc(code) + '</code>' +
          '<p>이 코드는 지금만 보여요. 꼭 저장해두세요.</p>';
        btn.disabled = false;
        btn.textContent = "🔄 새 코드 발급 (지금 코드는 무효가 돼요)";
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).then(function () { _toast("복사됨 ✓"); }).catch(function () {});
        }
      }).catch(function () {
        btn.disabled = false;
        ov.querySelector("#cloud-out").innerHTML = '<p>⚠️ 지금은 발급할 수 없어요. 잠시 뒤 다시 시도해주세요.</p>';
      });
    };

    ov.querySelector("#cloud-claim").onclick = function () {
      var v = ov.querySelector("#cloud-code-input").value.trim();
      var msg = ov.querySelector("#cloud-msg");
      if (!v) { msg.innerHTML = '<p>코드를 입력해주세요.</p>'; return; }
      this.disabled = true;
      rpc("cloud_claim", { p_token: token(), p_code: v }).then(function (ok) {
        if (!ok) { msg.innerHTML = '<p>⚠️ 코드가 맞지 않거나 이미 사용됐어요.</p>'; return; }
        set(dirtyKey(cur), "1");           // 로컬 진행이 있을 수 있으니 충돌 판정을 거치게 해요
        _toast("연결됐어요");
        closeModal();
        openLink();
      }).catch(function () {
        msg.innerHTML = '<p>⚠️ 연결에 실패했어요. 인터넷을 확인해주세요.</p>';
      }).then(function () { var b = ov.querySelector("#cloud-claim"); if (b) b.disabled = false; });
    };
  }
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `cd /workspace/grow-games && node /tmp/claude-0/-workspace/e471dffd-68a9-4271-9b48-58c8b140bbbb/scratchpad/cloud-ui-test.js`
Expected: 모든 줄 ✅

> 이 시점에 `openLink`가 아직 없어 `cloud-claim` 클릭 경로가 깨진다. Step 6에서 채운다.
> 테스트는 발급 경로만 확인하므로 통과한다.

- [ ] **Step 6: 연결 확인 화면(`openLink`)과 충돌 화면(`onConflict`) 구현**

`openModal` 다음에 추가:

```js
  // 게임별 한 줄 요약 — 세이브 구조만 보고 만드는 순수 함수예요
  var SUMMARY = {
    rookie: function (s) { return s.phase === "pro" ? "프로 " + (s.proYear || 0) + "년차" : "고교 " + (s.year || 1) + "학년"; },
    idol: function (s) { return s.debut ? "데뷔 " + (s.year || 0) + "년차" : "연습생"; },
    stock: function (s) { return "자산 " + Math.round((s.money || 0) / 10000) + "만"; },
    dev: function (s) { return (s.year || 1) + "년차 개발자"; },
    chef: function (s) { return (s.star || 0) + "성 셰프"; },
    stream: function (s) { return "구독자 " + (s.subs || 0); },
    soccer: function (s) { return s.phase === "pro" ? "프로 " + (s.proYear || 0) + "년차" : "유스"; },
    unicorn: function (s) { return (s.stage || "창업 준비"); },
  };
  var LABEL = {
    rookie: "⚾ 더 루키", idol: "🎤 아이돌", stock: "📈 주식", dev: "💻 개발자",
    chef: "🍳 요리사", stream: "📺 스트리머", soccer: "⚽ 축구", unicorn: "🦄 유니콘",
  };

  function summarize(game, obj) {
    try {
      var raw = obj && obj[SAVE[game]];
      if (!raw) return null;
      var s = JSON.parse(raw);
      var f = SUMMARY[game];
      return f ? f(s) : "기록 있음";
    } catch (e) { return "기록 있음"; }
  }

  var GAMES = Object.keys(SAVE);

  /* 연결 직후 화면 — 한쪽에만 있는 게임은 자동으로 합치고,
   * 양쪽 모두 있는 게임만 고르게 해요. */
  function openLink() {
    rpc("cloud_pull", { p_token: token(), p_game: null }).then(function (rows) {
      var remote = {};
      (rows || []).forEach(function (r) {
        var g = String(r.game).replace(/^beta:/, "");
        remote[g] = r;
      });
      var auto = [], pick = [];
      GAMES.forEach(function (g) {
        var mine = summarize(g, collect(g));
        var theirs = remote[g] ? summarize(g, remote[g].data) : null;
        if (mine && theirs) pick.push({ g: g, mine: mine, theirs: theirs });
        else if (theirs) auto.push({ g: g, from: "다른 기기", txt: theirs });
        else if (mine) auto.push({ g: g, from: "이 기기", txt: mine });
      });

      var html = '<p class="av-title">🔗 기기를 연결했어요</p>';
      if (auto.length) {
        html += '<p>자동으로 합쳐진 기록</p>';
        auto.forEach(function (a) {
          html += '<div class="cloud-pick">' + esc(LABEL[a.g]) + ' — ' + esc(a.txt) +
                  ' <span style="color:var(--dim)">(' + a.from + ')</span></div>';
        });
      }
      pick.forEach(function (p) {
        html += '<p>⚠️ 양쪽 모두 기록이 있어요. 골라주세요.</p>' +
          '<div class="cloud-pick"><b>' + esc(LABEL[p.g]) + '</b>' +
          '<label><input type="radio" name="pk-' + p.g + '" value="mine"/> 이 기기 — ' + esc(p.mine) + '</label>' +
          '<label><input type="radio" name="pk-' + p.g + '" value="theirs" checked/> 다른 기기 — ' + esc(p.theirs) + '</label>' +
          '</div>';
      });
      html += '<button class="btn btn-primary" id="cloud-done">연결 완료</button>';

      var ov = shell(html);
      ov.querySelector("#cloud-done").onclick = function () {
        pick.forEach(function (p) {
          var sel = ov.querySelector('input[name="pk-' + p.g + '"]:checked');
          if (sel && sel.value === "theirs") apply(p.g, remote[p.g].data);
        });
        auto.forEach(function (a) {
          if (a.from === "다른 기기") apply(a.g, remote[a.g].data);
        });
        GAMES.forEach(function (g) { set(dirtyKey(g), "1"); });
        closeModal();
        _toast("불러왔어요");
        setTimeout(function () { location.reload(); }, 700);
      };
    }).catch(function () { _toast("불러오기에 실패했어요"); });
  }

  /* 충돌 — 같은 게임을 두 기기에서 각각 진행했을 때 */
  function onConflict(game, updated) {
    var mine = summarize(game, collect(game));
    rpc("cloud_pull", { p_token: token(), p_game: tag(game) }).then(function (rows) {
      if (!rows || !rows.length) return;
      var theirs = summarize(game, rows[0].data);
      var ov = shell(
        '<p class="av-title">⚠️ 두 기기에서 각각 진행됐어요</p>' +
        '<div class="cloud-pick">이 기기 &nbsp; ' + esc(LABEL[game]) + ' — ' + esc(mine || "기록 없음") + '</div>' +
        '<div class="cloud-pick">다른 기기 &nbsp; ' + esc(LABEL[game]) + ' — ' + esc(theirs || "기록 없음") + '</div>' +
        '<button class="btn btn-primary" id="cloud-keep">이 기기 것 쓰기</button>' +
        '<button class="btn btn-ghost" id="cloud-take">다른 기기 것 쓰기</button>'
      );
      ov.querySelector("#cloud-keep").onclick = function () { closeModal(); push(game); _toast("이 기기 기록을 올렸어요"); };
      ov.querySelector("#cloud-take").onclick = function () {
        apply(game, rows[0].data);
        set(syncKey(game), String(rows[0].updated));
        set(dirtyKey(game), "0");
        closeModal();
        setTimeout(function () { location.reload(); }, 400);
      };
    }).catch(function () {});
  }
```

그리고 파일 끝의 노출부를 아래로 교체한다:

```js
  window.Cloud = {
    init: init, touch: touch, mark: mark,
    openModal: openModal, onConflict: onConflict,
    _toast: _toast, _pull: pullAndApply,
  };
  window.Cloud._t = {
    token: token, keysOf: keysOf, collect: collect, apply: apply,
    rpc: rpc, tag: tag, decide: decide, summarize: summarize,
  };
```

- [ ] **Step 7: 세 테스트 모두 통과 확인**

```bash
cd /workspace/grow-games
for f in cloud-test cloud-sync-test cloud-ui-test; do
  echo "--- $f"; node /tmp/claude-0/-workspace/e471dffd-68a9-4271-9b48-58c8b140bbbb/scratchpad/$f.js || break
done
```
Expected: 셋 다 `✅ 통과`

- [ ] **Step 8: 커밋**

```bash
cd /workspace/grow-games
git add beta/cloud.js beta/base.css
git commit -m "$(cat <<'EOF'
feat(베타): 클라우드 세이브 UI — 연동 모달·충돌 화면·동기화 토스트

코드는 발급하면 클립보드에 복사되고 화면에도 떠요. 클립보드는
다른 걸 복사하면 날아가니까요.

연결 직후에는 한쪽에만 있는 게임을 자동으로 합치고, 양쪽 모두
기록이 있는 게임만 고르게 해요.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: 8개 게임 연결

**Files:**
- Modify: `beta/rookie/index.html`, `beta/idol/index.html`, `beta/stock/index.html`, `beta/dev/index.html`, `beta/chef/index.html`, `beta/stream/index.html`, `beta/soccer/index.html`, `beta/unicorn/index.html`
- Modify: 각 게임의 `game.js` (저장 함수) · `career.js` (은퇴·환생)
- Test: `/tmp/claude-0/-workspace/e471dffd-68a9-4271-9b48-58c8b140bbbb/scratchpad/cloud-wire-test.js`

**Interfaces:**
- Consumes: `Cloud.init(game)`, `Cloud.touch()`, `Cloud.mark()`, `Cloud.openModal()`

- [ ] **Step 1: 실패하는 테스트 작성**

`scratchpad/cloud-wire-test.js`:

```js
/* 8종 배선 검증 — 버튼·스크립트·호출이 다 들어갔는지 */
"use strict";
const fs = require("fs");
const B = "/workspace/grow-games/beta";
const GAMES = ["rookie", "idol", "stock", "dev", "chef", "stream", "soccer", "unicorn"];
let fail = 0;
const check = (ok, msg) => { console.log(`${ok ? "✅" : "❌"} ${msg}`); if (!ok) fail++; };

for (const g of GAMES) {
  const html = fs.readFileSync(`${B}/${g}/index.html`, "utf8");
  check(/id="btn-cloud"/.test(html), `${g}: 🔗 기록 연동 버튼`);
  check(/src="\.\.\/cloud\.js"/.test(html), `${g}: cloud.js 로드`);
  const js = fs.readdirSync(`${B}/${g}`).filter((f) => f.endsWith(".js"))
    .map((f) => fs.readFileSync(`${B}/${g}/${f}`, "utf8")).join("\n");
  check(/Cloud\.init\(/.test(js), `${g}: Cloud.init 호출`);
  check(/Cloud\.touch\(\)/.test(js), `${g}: Cloud.touch 호출`);
  check(/btn-cloud/.test(js), `${g}: 버튼에 openModal 연결`);
}
// 은퇴가 있는 7종은 mark()도 있어야 해요
for (const g of GAMES.filter((x) => x !== "unicorn")) {
  const js = fs.readFileSync(`${B}/${g}/career.js`, "utf8");
  check(/Cloud\.mark\(\)/.test(js), `${g}: 은퇴·환생에 Cloud.mark`);
}
console.log(fail ? `\n❌ ${fail}건 실패` : "\n✅ 통과");
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: 실패 확인**

Run: `cd /workspace/grow-games && node /tmp/claude-0/-workspace/e471dffd-68a9-4271-9b48-58c8b140bbbb/scratchpad/cloud-wire-test.js`
Expected: 대부분 ❌

- [ ] **Step 3: 8개 `index.html`에 버튼과 스크립트 추가**

각 게임에서 `id="btn-hof"` 버튼이 있는 줄 **다음**에 아래를 넣는다.
(유니콘은 `btn-hof`가 타이틀에 있으면 그 다음, 없으면 타이틀 마지막 버튼 다음)

```html
        <button class="btn btn-ghost" id="btn-cloud">🔗 기록 연동</button>
```

그리고 `<script src="career.js"></script>` **다음** 줄에 (유니콘은 `game.js` 다음):

```html
  <script src="../cloud.js"></script>
```

- [ ] **Step 4: 각 게임 `game.js`에 `init`·`touch`·버튼 연결**

각 게임 `game.js`의 `function save()` 본문 끝(마지막 `localStorage.setItem` 뒤)에 추가:

```js
  if (window.Cloud) Cloud.touch();
```

그리고 파일 맨 끝에 추가:

```js
/* ☁️ 클라우드 세이브 연결 — 타이틀 진입 시 서버와 맞춰요 */
if (window.Cloud) {
  Cloud.init("<GAME>");
  $("btn-cloud")?.addEventListener("click", () => Cloud.openModal());
}
```

`<GAME>`은 각각 `rookie` · `idol` · `stock` · `dev` · `chef` · `stream` · `soccer` · `unicorn`으로 바꾼다.

- [ ] **Step 5: 7종 `career.js`의 은퇴·환생·시즌종료에 `mark()` 추가**

`enshrine`(은퇴)과 `rebirth`(환생) 함수에서 `save()` 또는 `clearSave()`를 부르는 줄 **다음**에,
그리고 `finishSeason`의 `S.career.seasons.push(...)` **다음**에 각각 추가:

```js
    if (window.Cloud) Cloud.mark();
```

- [ ] **Step 6: 배선 테스트 통과 확인**

Run: `cd /workspace/grow-games && node /tmp/claude-0/-workspace/e471dffd-68a9-4271-9b48-58c8b140bbbb/scratchpad/cloud-wire-test.js`
Expected: 모든 줄 ✅

- [ ] **Step 7: 구문 검사**

```bash
cd /workspace/grow-games
for g in rookie idol stock dev chef stream soccer unicorn; do
  for f in beta/$g/*.js; do node --check "$f" || echo "FAIL $f"; done
done
node --check beta/cloud.js && echo "전부 OK"
```
Expected: `전부 OK`, FAIL 없음

- [ ] **Step 8: 기존 회귀 테스트 통과 확인**

```bash
cd /workspace/grow-games
node /tmp/claude-0/-workspace/e471dffd-68a9-4271-9b48-58c8b140bbbb/scratchpad/dom-test.js /workspace/grow-games/beta/rookie 2>&1 | grep -v scrollTo
```
Expected: `✅ 실제 DOM에서 전부 통과` — 클라우드 배선이 기존 게임 흐름을 깨지 않았는지 확인한다.

- [ ] **Step 9: 커밋**

```bash
cd /workspace/grow-games
git add beta/
git commit -m "$(cat <<'EOF'
feat(베타): 8종에 클라우드 세이브 연결

타이틀에 🔗 기록 연동 버튼을 넣고, 저장할 때 touch()·
은퇴와 환생에 mark()를 걸었어요. 게임 로직은 안 건드렸어요.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: 도움말 항목과 발급 권유

**Files:**
- Modify: `beta/rookie/game.js`, `beta/idol/game.js`, `beta/stock/game.js`, `beta/dev/game.js`, `beta/chef/game.js`, `beta/stream/game.js`, `beta/soccer/game.js` (도움말 배열)
- Modify: `beta/cloud.js` (발급 권유)

**Interfaces:**
- Consumes: `Cloud.openModal()`

- [ ] **Step 1: 7종 도움말에 항목 추가**

각 게임 `game.js`에서 `Help.open(...)`에 넘기는 배열의 **마지막 원소 다음**에 추가:

```js
    { emoji: "💾", title: "기록 보관", body:
      "기록은 이 기기의 브라우저에 저장되고, 서버에도 자동 백업돼요.\n" +
      "기기를 바꾸거나 브라우저 데이터를 지우면 이 기기의 기록은 사라져요.\n" +
      "타이틀 화면의 🔗 기록 연동에서 코드를 복사해 두면 새 기기에서 그대로 이어받을 수 있어요." },
```

유니콘은 `help.js`를 쓰지 않으므로 건드리지 않는다.

- [ ] **Step 2: 첫 은퇴 후 발급 권유**

`beta/cloud.js`의 `mark()`를 아래로 교체한다:

```js
  function mark() {
    if (!cur) return;
    push(cur);
    // 첫 은퇴처럼 "잃을 게 생긴" 순간에 한 번만 권해요. 그 뒤로는 조르지 않아요.
    if (get("grow-cloud-issued") !== "1" && get("grow-cloud-asked") !== "1") {
      set("grow-cloud-asked", "1");
      setTimeout(function () {
        var ov = shell(
          '<p class="av-title">💾 기록을 지킬까요?</p>' +
          '<p>지금 기록은 이 기기에만 있어요.<br/>' +
          '브라우저 데이터를 지우거나 기기를 바꾸면 사라져요.<br/>' +
          '연동 코드를 하나 받아두면 새 기기에서 그대로 이어받을 수 있어요.</p>' +
          '<button class="btn btn-primary" id="cloud-go">🔗 코드 받기</button>'
        );
        ov.querySelector("#cloud-go").onclick = function () { closeModal(); openModal(); };
      }, 1200);
    }
  }
```

- [ ] **Step 3: 구문 검사와 전체 테스트**

```bash
cd /workspace/grow-games
node --check beta/cloud.js
for g in rookie idol stock dev chef stream soccer unicorn; do
  for f in beta/$g/*.js; do node --check "$f" || echo "FAIL $f"; done
done
for f in cloud-test cloud-sync-test cloud-ui-test cloud-wire-test; do
  echo "--- $f"; node /tmp/claude-0/-workspace/e471dffd-68a9-4271-9b48-58c8b140bbbb/scratchpad/$f.js || break
done
```
Expected: FAIL 없음, 네 테스트 모두 `✅ 통과`

- [ ] **Step 4: 도움말이 실제로 열리는지 jsdom 확인**

```bash
cd /workspace/grow-games
node /tmp/claude-0/-workspace/e471dffd-68a9-4271-9b48-58c8b140bbbb/scratchpad/dom-test.js /workspace/grow-games/beta/rookie 2>&1 | grep -v scrollTo
```
Expected: `✅ 실제 DOM에서 전부 통과`

- [ ] **Step 5: 커밋**

```bash
cd /workspace/grow-games
git add beta/
git commit -m "$(cat <<'EOF'
feat(베타): 클라우드 세이브 도움말과 첫 은퇴 후 발급 권유

코드를 안 받아둔 사람은 복구할 방법이 없어서, 잃을 게 생긴
첫 은퇴 순간에 한 번만 권해요. 그 뒤로는 조르지 않아요.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: 실제 서버로 왕복 검증 후 베타 배포

**Files:**
- Test: `/tmp/claude-0/-workspace/e471dffd-68a9-4271-9b48-58c8b140bbbb/scratchpad/cloud-e2e.sh`

- [ ] **Step 1: 핵심 시나리오 스크립트 작성**

스펙 9절의 "왕복 동기화"를 실제 서버로 확인한다.

`scratchpad/cloud-e2e.sh`:

```bash
#!/usr/bin/env bash
# A에서 플레이 → B로 연결 → B에서 플레이 → A가 B의 진행을 받아오는지
set -euo pipefail
Q() { curl -s -X POST "$GROW_GAMES_SUPABASE_URL/rest/v1/rpc/$1" \
  -H "apikey: $GROW_GAMES_SUPABASE_PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $GROW_GAMES_SUPABASE_PUBLISHABLE_KEY" \
  -H "Content-Type: application/json" -d "$2"; }

A="e2e-aaaaaaaaaaaaaaaaaaaa"
B="e2e-bbbbbbbbbbbbbbbbbbbb"

echo "1) A가 저장"
A1=$(Q cloud_push "{\"p_token\":\"$A\",\"p_game\":\"beta:rookie\",\"p_data\":{\"rookie-save-v1\":\"{\\\"proYear\\\":1}\"}}")
echo "   updated=$A1"

echo "2) A가 코드 발급"
CODE=$(Q cloud_issue "{\"p_token\":\"$A\"}" | tr -d '"')
echo "   code=$CODE"

echo "3) B가 연결"
Q cloud_claim "{\"p_token\":\"$B\",\"p_code\":\"$CODE\"}"; echo

echo "4) B가 A 기록을 보는지"
Q cloud_pull "{\"p_token\":\"$B\",\"p_game\":\"beta:rookie\"}"; echo

echo "5) B가 더 진행해서 저장"
B1=$(Q cloud_push "{\"p_token\":\"$B\",\"p_game\":\"beta:rookie\",\"p_data\":{\"rookie-save-v1\":\"{\\\"proYear\\\":5}\"}}")
echo "   updated=$B1"

echo "6) A가 다시 접속 — meta가 B의 최신 시각을 주는지"
Q cloud_meta "{\"p_token\":\"$A\"}"; echo

echo "7) A가 받아오면 proYear=5여야 함"
Q cloud_pull "{\"p_token\":\"$A\",\"p_game\":\"beta:rookie\"}"; echo
```

- [ ] **Step 2: 실행**

```bash
cd /workspace/grow-games
chmod +x /tmp/claude-0/-workspace/e471dffd-68a9-4271-9b48-58c8b140bbbb/scratchpad/cloud-e2e.sh
doppler run -- /tmp/claude-0/-workspace/e471dffd-68a9-4271-9b48-58c8b140bbbb/scratchpad/cloud-e2e.sh
```

Expected:
- 3) `true`
- 4) `proYear\":1`이 보임 (B가 A 기록을 받음)
- 6) `updated`가 5)의 `B1`과 같음 — **A 입장에서 서버가 더 최신**
- 7) `proYear\":5` — **핵심 시나리오 성립**

하나라도 어긋나면 여기서 멈추고 원인을 찾는다. 배포하지 않는다.

- [ ] **Step 3: 시험 데이터 정리**

Task 1 Step 5의 명령을 다시 실행하고, RLS 확인(Step 4)도 다시 돌린다.

- [ ] **Step 4: 베타 배포**

```bash
cd /workspace/grow-games
git status --short
doppler run -- git fetch origin main
git log --oneline HEAD..origin/main
```

원격에 새 커밋이 있으면 `git rebase origin/main` 후 테스트를 전부 다시 돌린다.
없으면 바로:

```bash
cd /workspace/grow-games
doppler run -- git push origin main
```

- [ ] **Step 5: 배포 확인**

```bash
cd /workspace/grow-games
until curl -s https://parkbeommin.github.io/grow-games/beta/cloud.js | grep -q cloud_claim; do sleep 10; done
B=https://parkbeommin.github.io/grow-games/beta
printf "cloud.js:      %s\n" "$(curl -s $B/cloud.js | grep -c cloud_claim)"
printf "모달 CSS:      %s\n" "$(curl -s $B/base.css | grep -c cloud-modal)"
for g in rookie idol stock dev chef stream soccer unicorn; do
  printf "%-8s 버튼 %s · 스크립트 %s\n" "$g" \
    "$(curl -s $B/$g/ | grep -c 'btn-cloud')" \
    "$(curl -s $B/$g/ | grep -c 'cloud.js')"
done
printf "상용 미반영(0이어야 함): %s\n" \
  "$(curl -s https://parkbeommin.github.io/grow-games/rookie/index.html | grep -c 'btn-cloud')"
```

Expected: 베타는 전부 1 이상, 상용은 0.

---

## Self-Review

**스펙 커버리지**

| 스펙 절 | 담당 |
|---|---|
| 4.1 테이블 · 4.2 함수 · 4.3 연결 | Task 1 |
| 4.2.1 코드 형식 (24자, 혼동 문자 제외) | Task 1 Step 1 `cloud_issue` |
| 5.1 두 값 · 5.2 올리는 시점 · 5.5 실패 처리 | Task 2 |
| 5.3 판정 4분기 | Task 3 |
| 5.4 충돌 화면 | Task 4 Step 6 |
| 5.6 베타 격리 (`beta:` 접두어) | Task 2 `tag()`, Task 2 테스트 |
| 6.0 저장 키 표 | Task 2 `SAVE`/`BATTLE`/`SHARED_KEY` |
| 6.1 모달 · 클립보드 | Task 4 |
| 6.2 연결 확인 (게임 단위 자동 병합) | Task 4 Step 6 `openLink` |
| 6.3 동기화 표시 | Task 4 `_toast` + CSS |
| 7 한계 (발급 권유) | Task 6 Step 2 |
| 8 도움말 | Task 6 Step 1 |
| 9 검증 | Task 1 Step 3~4, Task 7 |

**빠진 것으로 확인된 항목:** 없음.

**타입 일관성:** `cloud_push`는 Task 1에서 `timestamptz`를 반환하고 Task 2가 문자열로 저장한다.
`decide`는 Task 3에서 정의하고 Task 3 Step 5에서만 쓴다. `apply`/`collect`는 Task 2에서
정의해 Task 4가 그대로 쓴다. `shell`/`closeModal`/`_toast`는 Task 4에서 정의하고
Task 6이 쓴다 — Task 6은 Task 4 이후에만 실행 가능하다.

**알려진 위험**

1. **Task 1 Step 2의 DDL 적용 경로가 불확실하다.** Supabase는 임의 SQL 실행 REST
   엔드포인트를 기본 제공하지 않는다. 두 방법이 다 실패하면 사용자에게 SQL Editor
   붙여넣기를 요청하도록 명시했다. 추측으로 반복 시도하지 않는다.
2. **`SUMMARY`의 세이브 필드 이름이 게임마다 다르다.** 루키만 코드로 확인했다
   (`phase`, `proYear`, `year`). 나머지 7종은 Task 4 구현 시 각 `game.js`의
   `newState()`를 열어 실제 필드로 고쳐야 한다. 틀리면 요약이 "기록 있음"으로
   떨어질 뿐 기능은 정상 동작한다.
3. **CSS 렌더링은 검증할 수 없다.** 배포 후 실기기 확인이 필요하다.
