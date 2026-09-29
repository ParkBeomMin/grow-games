# 설계 — D 🌐 서버 기능 (Supabase)

2026-09-28 · grow-designer · 대상 `beta/soccer/` · 전체 지도는 `10_designer_overview.md` · **③ 단계**

> ⚠️ **아래 SQL은 초안입니다. 운영 DB에 적용하지 않습니다 — 사용자 승인 뒤에만.** ③의 engineer가 이 초안을
> `docs/superpowers/sql/soccer-online.sql`(제안)로 **파일만** 만들고, 적용은 승인 뒤 오케스트레이터가 `운영 접속 정보`의 절차로 합니다.
> ⚠️ 판단 지점 14(이름 공개)·15(결번 자격)·16(공유 링크)·17(베타)·18(최초 기록 대상)의 **추천안을 전제로** 썼습니다.
> ⚠️ D는 밸런스를 흔들지 않습니다. 대신 **보안(XSS·남용)·개인정보·운영 DB**가 걸립니다.

---

## 무엇을 푸는가

### 지금 서버에 있는 것 — 선례

| 표 | 읽기 | 쓰기 | 어디 |
|---|---|---|---|
| `hof` | anon select | anon **insert만** · **UPDATE·DELETE 정책 없음** | `match.js:162-180` · 가리기는 `hof_word_clear` RPC(비밀번호) |
| `hof_month_top`(뷰) | anon | — | `match.js:198-239` |
| `players` | anon | insert·update(upsert) | 배틀 매칭 `match.js:6-19` |
| `fever` | anon | **정책 없음** — `fever_set`·`fever_clear` RPC(비밀번호)만 | `fever.js:24-28` · `stats/index.html:640-650` |
| `events` | **정책 없음** — 집계 뷰만 anon에 `grant select` | anon insert만 | `stats.js:3-17` · `stats/index.html:525-551` |
| `cloud_*` | **정책 없음** — `security definer` 함수만 | 함수만 | `docs/superpowers/cloud-schema.sql` |

선례가 말하는 규칙 넷 — **읽기는 정책 한 줄, 쓰기는 비밀번호 RPC나 insert-only, 남이 올린 값은 세 겹으로 막기, 서버가 꺼져도 게임은 그대로.**

### 없는 것

명예의 전당은 **은퇴한 뒤의 한 줄**뿐이다. 경기 도중의 성취가 남과 이어지는 자리(업적의 "처음"), 클럽이라는 장소에 남는 이름(결번),
커리어를 남에게 보여줄 길(링크), 지금 누가 뛰고 있는지(라이브) — 넷 다 없다.

### 조심할 것 — 이미 한 번 데였다

명전은 **남이 올린 값을 `innerHTML`로** 그리고 있었고, 이름 칸의 `<img onerror>`가 **8종 모든 플레이어 브라우저에서 실행될 수 있었다**([[버그 기록]] 2026-08-22).
D는 남이 올린 값을 그리는 표면을 **넷 더** 만든다. 이 문서의 절반은 그 방어다.

---

## 구조

### D-0. 원칙

1. **읽기 = 정책 한 줄(공개 칼럼만) · 쓰기 = `security definer` RPC 하나**(또는 hof와 같은 insert-only). 공개하지 않을 값(기기 토큰 해시)은
   **다른 표**에 둔다 — select 정책은 행 단위라 칼럼을 못 가린다
2. **UPDATE 정책을 만들지 않는다.** 결과를 명전 행에 되쓰지 않고 **별도 표**에 남긴다(`hof`는 INSERT 한 번 — 이미 정해진 것)
3. **남이 올린 문자열은 세 겹** — 서버 `CHECK`/정리 함수 · 받는 길 `Match.scrub`(`match.js:141-160`) · 그리는 자리 `esc`(`career.js:218-220`)
4. **서버는 사본이다** — 업적·결번 자격·필름은 전부 로컬이 주(主). 서버가 없으면 **그 칸을 안 그린다**(「0명」처럼 거짓 숫자를 띄우지 않는다)
5. **베타는 같은 표에 `game = "beta:soccer"`로**(판단 17 (b)) — 선례 `cloud.js:78-79`의 `tag()`. 명전(`hof`)은 베타에서 **여전히 끈다**(`match.js:33` 그대로)
6. **공유 파일을 안 늘린다** — 새 호출은 전부 전용 파일 `beta/soccer/online.js`(`window.WingerOnline`)에. `match.js`는 이미 내보내는 `cfg`·`scrub`만 빌린다

### D-1. 🥇 서버 최초 기록 — 업적마다 처음 해낸 사람

```
업적 획득(B) ─▶ 드묾 이상이고 이 기기가 아직 안 올렸으면 book.pend 에 id  (판단 18 (b))
                 │
 online.js ◀─────┘  타이틀 진입 · 결산 뒤 · 도감 열 때 — 대기열을 비운다
   └─ rpc ach_first_claim(token, game, ach, name|null) ─▶ { ach, name, at, mine }
        · mine → 「🥇 서버 최초 달성!」 queueFx 한 칸 + book.first[id] = {mine, name, at}
        · 아니면 book.first[id] = {name, at} (누가 먼저였는지)
   실패(오프라인·오류) → pend 에 그대로, 다음 기회에
```

- **보이는 곳**: 📖 도감 → 🏅 업적 칸 아래 「🥇 서버 최초 — 김도현 · 2026.10.02」(익명이면 「🥇 서버 최초 — 익명의 선수」) · 내가 최초면 칸에 금테
- 읽기: 도감을 열 때 `ach_first?game=eq.soccer&select=ach,name,at` **한 번**(업적 수만큼, 60줄 남짓) — 10분 캐시
- **이름**은 판단 14의 설정이 켜져 있을 때만 보낸다. 끄면 `null`(익명)
- 규칙 쪽(도감 📐)에 한 줄: 「서버 최초 기록은 기기가 올려요. 이상한 기록은 운영자가 가릴 수 있어요.」 — **클라이언트 게임이라 위조를 원천 차단할 수 없다**는 걸 숨기지 않는다

### D-2. 🎽 구단별 영구결번 — 기존 `hof` 위에

**자격(판단 15 (a))** — 명예의 전당에 올라간 커리어 중, **가장 오래 뛴 클럽에서 5시즌 이상**. 번호는 그 커리어의 등번호(B의 `S.no`, 판단 9).
명전 항목에 `home: { club, seasons }` · `no`가 **한 번의 INSERT에 같이** 실려 있다(12번 문서 B-3).

| 흐름 | 규칙 |
|---|---|
| 언제 신청하나 | 명전 INSERT(`flushHof`)가 **성공한 뒤** — 자격 판정을 서버가 **그 명전 행**에서 하기 때문 |
| 누가 받나 | 같은 (게임, 클럽, 번호)를 **먼저 올린 한 명**. 뒤에 온 사람은 🧱 **명예의 벽**(같은 클럽·같은 번호의 다른 전설들) |
| 서버가 믿는 것 | 클라이언트가 넘긴 클럽·번호가 **아니라 명전 행의 `data.home`·`data.no`** — 자격(5시즌)도 서버가 그 행으로 판정 |
| 한 커리어 한 번 | `(game, hof_id)` 유일 — 결번이든 벽이든 한 줄 |
| 「서버 N번째 결번」 | 같은 게임 안의 순서(`seq`) — 화면이 목록에서 센다 |
| 재시도 | 같은 명전 행으로 다시 불러도 **같은 답**(이미 받은 결번·벽 줄을 돌려준다) |
| 실패 | 명전 항목에 `noSent: false` — 다음에 명예의 전당을 열 때 다시(지금 `sent: false`와 같은 방식, `career.js:246-259`) |

**보이는 곳**
- 명전 카드(`openHofCard`): 「🎽 한강 FC 10번 — 영구결번 (서버 7번째)」 또는 「🧱 명예의 벽 — 한강 FC 10번은 ○○의 번호예요」
- 명예의 전당 화면에 탭 하나 「🎽 영구결번」 — 클럽별로 모아, 최신순
- 👥 스쿼드 레이어 머리에 「🎽 이 클럽의 결번 — 10 김도현 · 7 …」(내 클럽에 있을 때만) — **우리 클럽이 누군가의 클럽**이라는 감각

**이름 공개와의 관계(판단 14 (b))** — 명전 항목에 `anon: true`면 결번 줄의 이름도 `null`(「익명의 전설」). 번호는 그래도 결번된다 —
이름을 숨긴 사람이 번호까지 잃으면 설정이 벌이 된다.

### D-3. 🔗 보기 전용 공유 링크 — 명전 행 id로 (판단 16 (a))

| 항목 | 규칙 |
|---|---|
| 링크 | `…/grow-games/soccer/?hof=soccer-w1727000000000` — `hof.id`가 곧 링크(`match.js:169`의 `${game}-${entry.id}`) |
| 필름 | 명전 행에는 요약만 있다(12번 B-3 — 목록 다운로드를 무겁게 안 하려고). 필름은 **새 표 `hof_film`**에 같은 id로 — 명전 INSERT 직후 한 번 INSERT, 수정·삭제 없음 |
| 자유 글은 필름에 안 넣는다 | 이름·한마디는 `hof_film`에 싣지 않고 **명전 행에서** 읽는다 — 한마디 가리기(`hof_word_clear`)가 그대로 먹힌다. 필름엔 클럽·리그·업적 id·숫자만 |
| 보는 화면 | 페이지가 `?hof=`로 열리면 **세이브를 건드리지 않는** 보기 전용 필름 한 장 — 맨 아래 「⚽ 내 선수 키우기」(타이틀로). 우리 말로 쓴다 |
| 링크 검증 | 매개변수가 `^soccer-w\d{10,16}$`(베타는 `beta:soccer-…`)가 **아니면 무시** — 그대로 화면에 쓰지 않는다 |
| 못 읽으면 | 「기록을 불러오지 못했어요」 + 같은 버튼 |
| 공유 버튼 | 필름 마지막 장·명전 카드(내 항목). 아직 안 올라갔으면(`sent:false`) 먼저 올리고, 실패하면 「명예의 전당에 올라간 뒤에 링크가 생겨요」 — 이미지 공유(B-11)는 늘 된다 |

### D-4. 🟢 타이틀의 라이브 현황

타이틀의 「⚽ 지금까지 N명의 유망주가…」(`game.js:1299-1306`) 아래 카드 한 장:

> 🟢 **최근 10분 동안 12명이 뛰었어요** · 오늘 새 선수 34 · 오늘 치른 시즌 51 · 오늘 은퇴 5
> 🏛️ 김도현 · 🐐 축구 역사에 남을 레전드 · 3,510점 · 12분 전
> 🏛️ 익명의 선수 · 🏅 리그의 상징 · 1,120점 · 40분 전

| 숫자 | 어디서 | 정직하게 적는 법 |
|---|---|---|
| 뛰는 중 | `cloud_save.updated`가 10분 안인 계정 수(자동 백업이 20초 간격으로 올라간다, `cloud.js:19`) | "지금 접속"이 아니라 **「최근 10분 동안 뛴」** — 재는 것을 그대로 부른다 |
| 오늘 새 선수·시즌·은퇴 | `events`의 `new_player`·`year_end`·`retire`(서울 날짜) | 상용만(베타는 이벤트를 안 남긴다 — 그 칸을 숨긴다) |
| 최근 줄 | `hof`의 최근 헌액 6줄(`data.at` 순) | 이름 설정이 꺼진 항목은 「익명의 선수」 |

- **집계만 내보내는 함수 하나**(`soccer_live`) — 표 행·토큰·기기 id는 절대 안 나간다
- 타이틀을 열 때 **한 번**만 부른다. 폴링 없음(정적 페이지라 서버가 먼저 말을 걸 수 없고 — `fever.js:8-12` — 그럴 필요도 없다). 60초 캐시
- 실패·함수 없음(SQL 미적용) → **카드를 통째로 숨긴다**

### D-5. 🙈 이름 공개 설정 (판단 14 (b))

- 기기 설정 하나 「내 이름을 서버 기록에 올리기」 — **기본 켬**. 명예의 전당 화면 머리와 필름 마지막 장에 스위치
- 끄면 **그 뒤로 올라가는 모든 서버 기록**이 익명: 서버 최초(`name: null`) · 명전 항목(`anon: true` + 보내는 사본의 이름을 「익명의 선수」로) · 결번 · 라이브 줄
- 이미 올라간 기록은 안 바뀐다 — `hof`에 UPDATE가 없고(원칙 D-0-2), 그게 사용자가 이미 정한 규칙이다. 스위치 옆에 그렇게 적는다
- 명전의 이름 바꾸기는 `soccer`만의 사본(`flushHof`, `career.js:250`)에서 한다 — 공유 `match.js`를 안 고친다

### D-6. 🛠️ 관리 도구 — `stats/index.html` ⚽ 탭에 두 절

선례는 피버·한마디 가리기(`stats/index.html:731-796`) — 비밀번호를 받는 RPC 하나씩. 같은 모양으로:

| 절 | 버튼 | RPC |
|---|---|---|
| 🥇 서버 최초 기록 | 이름 가리기 · 지우기(다음 사람이 최초가 된다) | `ach_first_hide` · `ach_first_clear` |
| 🎽 영구결번 | 이름 가리기 · 지우기(**벽의 가장 이른 줄이 올라온다**) | `retired_no_hide` · `retired_no_clear` |

**비밀번호를 함수 본문에 평문으로 두는 선례**(`운영 접속 정보` — 바꿀 때 "두 함수를 함께 바꿔야" 하는 사고 위험)는 **새 함수에서 개선**한다:
해시 한 줄을 담는 잠긴 표(`admin_secret`) 하나를 새 함수 넷이 같이 본다. **기존 `fever_*`·`hof_word_clear`는 이번에 안 건드린다.**
비밀번호는 저장소에 두지 않는다 — 적용할 때 손으로 한 줄.

### D-7. 🛡️ XSS — 표면마다 세 겹

| 표면 | ① 서버 | ② 받는 길 | ③ 그리는 자리 |
|---|---|---|---|
| 서버 최초 기록의 이름 | `_soccer_name()` — 12자·태그 글자·제어문자·링크 모양이면 `null`(익명) · 칼럼 `CHECK` | `Match.scrub` | `esc` |
| 결번·벽의 클럽·이름 | 클럽 칼럼 `CHECK`(태그 글자·길이) + **값이 명전 행에서 온다** | `scrub` + **우리 클럽 목록(`clubsIn`·`CLUBS`)에 있는 이름만 그림**(없으면 「?」) | `esc` |
| 라이브 줄 | `_soccer_name()` · 등급 `left(…, 40)` · 숫자는 정규식 통과한 것만 캐스트 | `scrub` | `esc` |
| 공유 링크 — 명전 행 | (기존 `hof` 그대로) | `scrub`(`fetchHof` 선례, `match.js:237-238`) | `esc`(`openHofCard` 선례) |
| 공유 링크 — 필름 | 크기 `CHECK`(6KB) | `scrub` + **모르는 업적·리그·이벤트 id는 버림** | `esc` / 캔버스는 `fillText`(태그 해석 없음) |
| URL `?hof=` | — | 정규식 통과 못 하면 무시 | 화면에 그대로 안 씀 |

**변이 검증**(`hof-word-test` 방식): 그리는 길에서 `esc`를 뺀 페이지를 다시 세워 가짜 응답에 `<img src=x onerror=…>`를 넣었을 때
**태그가 실제로 DOM에 들어가는지**를 본다 — "esc가 이스케이프한다"만 보면 부르지도 않는 esc를 지키게 된다([[검증 수단]]).

### D-8. 폴백

| 상황 | 동작 |
|---|---|
| 오프라인 · RPC 실패 | 업적·필름·도감은 로컬 그대로. 최초 기록은 `book.pend`에, 결번은 `noSent:false`로 남아 다음 기회에 |
| SQL 미적용(표·함수 404) | 그 칸을 **안 그린다**. 한 번 404면 그 세션 동안 다시 안 두드린다 |
| 베타 | `game = "beta:soccer"` — 상용 표와 섞이지 않는다. 명전은 베타에서 꺼져 있으니 결번 신청은 **넘겨받은 요약**으로(아래 SQL `p_beta_data`) — 베타에서만 |
| 이름 공개 끔 | 모든 새 서버 기록 이름 `null` |
| 서버 최초 기록이 이미 남에게 있음 | 「🥇 서버 최초 — ○○」만 보인다. 내가 최초가 아니라는 사실이 벌이 되지 않게 **축하 연출은 내 것만** |

### D-9. SQL 초안 — 파일로 준비만

> 적용 순서(승인 뒤): ① 아래 0번 확인 쿼리로 **지금 DB가 초안이 가정한 모양인지**(명전·피버 스키마는 저장소에 SQL이 없다 — DB에만 있다)
> ② Management API로 적용 ③ **anon 키로 실제 호출**해 select·rpc가 되는지(선례: `stats_league`를 이렇게 확인했다) ④ 비밀번호 한 줄은 손으로
> ⑤ 되돌리기 SQL을 같이 둔다

```sql
-- ============================================================================
-- ⚽ 더 윙어 ③ 서버 기능 — 초안 (적용 전 검토 · 운영 DB 적용은 사용자 승인 뒤)
-- ============================================================================

-- 0) 적용 전 확인 — 이 초안이 가정한 모양인가
select tablename, policyname, cmd from pg_policies
 where tablename in ('hof', 'fever', 'events', 'players', 'cloud_save');
select column_name, data_type from information_schema.columns where table_name = 'hof';
select proname from pg_proc where proname in ('hof_word_clear', 'fever_set', 'fever_clear', 'cloud_account_of');

-- 1) 관리 비밀번호 — 평문 대신 해시 한 줄 (새 함수만 이 방식)
create table if not exists public.admin_secret (k text primary key, sha text not null);
alter table public.admin_secret enable row level security;          -- 정책 없음 → anon 접근 불가
-- 적용할 때 손으로 (저장소에 비번을 두지 않는다):
--   insert into public.admin_secret values ('soccer', encode(extensions.digest('<비번>', 'sha256'), 'hex'))
--   on conflict (k) do update set sha = excluded.sha;

create or replace function public._soccer_admin_ok(p_pw text) returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from public.admin_secret
                  where k = 'soccer' and sha = encode(digest(coalesce(p_pw, ''), 'sha256'), 'hex'));
$$;
revoke all on function public._soccer_admin_ok(text) from public, anon, authenticated;

-- 2) 이름 씻기 — 서버 쪽 첫 방어선. 이상하면 거절 대신 익명(null) — 기록은 남긴다
create or replace function public._soccer_name(p text) returns text
language sql immutable as $$
  select case
    when p is null or btrim(p) = ''                                   then null
    when char_length(btrim(p)) > 12                                    then null
    when p ~ '[<>&"''`\\[:cntrl:]]'                                    then null
    when p ~* '(https?:|www\.|://|\.(com|net|org|kr|io|gg|me)(\W|$))' then null
    else btrim(p)
  end;
$$;

-- 3) 🥇 서버 최초 기록
create table if not exists public.ach_first (
  game text        not null check (game in ('soccer', 'beta:soccer')),
  ach  text        not null check (ach ~ '^[a-z0-9_]{2,24}$'),
  name text        check (name is null or public._soccer_name(name) = name),
  at   timestamptz not null default now(),
  primary key (game, ach)
);
alter table public.ach_first enable row level security;
create policy "ach_first read" on public.ach_first for select using (true);
-- 쓰기 정책 없음 — 아래 RPC 하나뿐

create table if not exists public.ach_claim_log (            -- 공개 안 함: 남용 막기·추적
  id   bigint generated always as identity primary key,
  who  text        not null,                                  -- 기기 토큰의 SHA-256 (원문 아님)
  game text        not null,
  ach  text        not null,
  won  boolean     not null default false,
  at   timestamptz not null default now()
);
create index if not exists ach_claim_log_who_at on public.ach_claim_log (who, at desc);
alter table public.ach_claim_log enable row level security;   -- 정책 없음

create or replace function public.ach_first_claim(p_token text, p_game text, p_ach text, p_name text)
returns table (r_ach text, r_name text, r_at timestamptz, r_mine boolean)
language plpgsql security definer set search_path = public, extensions as $$
declare v_who text; v_n int; v_rows int;
begin
  if p_token is null or length(p_token) < 16 then raise exception '토큰이 올바르지 않아요'; end if;
  if p_game not in ('soccer', 'beta:soccer') then raise exception '게임이 올바르지 않아요'; end if;
  if p_ach is null or p_ach !~ '^[a-z0-9_]{2,24}$' then raise exception '업적 id가 올바르지 않아요'; end if;
  v_who := encode(digest(p_token, 'sha256'), 'hex');
  select count(*) into v_n from public.ach_claim_log l
   where l.who = v_who and l.at > now() - interval '1 day';
  if v_n >= 60 then raise exception '오늘은 더 올릴 수 없어요'; end if;
  insert into public.ach_first (game, ach, name)
       values (p_game, p_ach, public._soccer_name(p_name))
  on conflict (game, ach) do nothing;
  get diagnostics v_rows = row_count;
  insert into public.ach_claim_log (who, game, ach, won) values (v_who, p_game, p_ach, v_rows = 1);
  return query select f.ach, f.name, f.at, (v_rows = 1)
                 from public.ach_first f where f.game = p_game and f.ach = p_ach;
end; $$;
grant execute on function public.ach_first_claim(text, text, text, text) to anon;

create or replace function public.ach_first_hide(p_pw text, p_game text, p_ach text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public._soccer_admin_ok(p_pw) then raise exception '권한이 없어요'; end if;
  update public.ach_first set name = null where game = p_game and ach = p_ach;
end; $$;
create or replace function public.ach_first_clear(p_pw text, p_game text, p_ach text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public._soccer_admin_ok(p_pw) then raise exception '권한이 없어요'; end if;
  delete from public.ach_first where game = p_game and ach = p_ach;
end; $$;
grant execute on function public.ach_first_hide(text, text, text)  to anon;
grant execute on function public.ach_first_clear(text, text, text) to anon;

-- 4) 🎽 영구결번 · 🧱 명예의 벽
create table if not exists public.retired_no (
  game   text        not null check (game in ('soccer', 'beta:soccer')),
  club   text        not null check (char_length(club) between 1 and 24 and club !~ '[<>&"''`\\[:cntrl:]]'),
  no     int         not null check (no between 1 and 99),
  hof_id text        not null,
  name   text        check (name is null or public._soccer_name(name) = name),
  seq    bigint      generated always as identity,
  at     timestamptz not null default now(),
  primary key (game, club, no),
  unique (game, hof_id)
);
create table if not exists public.retired_wall (
  id     bigint      generated always as identity primary key,
  game   text        not null check (game in ('soccer', 'beta:soccer')),
  club   text        not null check (char_length(club) between 1 and 24 and club !~ '[<>&"''`\\[:cntrl:]]'),
  no     int         not null check (no between 1 and 99),
  hof_id text        not null,
  name   text        check (name is null or public._soccer_name(name) = name),
  at     timestamptz not null default now(),
  unique (game, hof_id)
);
alter table public.retired_no   enable row level security;
alter table public.retired_wall enable row level security;
create policy "retired_no read"   on public.retired_no   for select using (true);
create policy "retired_wall read" on public.retired_wall for select using (true);

create table if not exists public.retire_claim_log (
  id bigint generated always as identity primary key,
  who text not null, game text not null, hof_id text not null, at timestamptz not null default now()
);
create index if not exists retire_claim_log_who_at on public.retire_claim_log (who, at desc);
alter table public.retire_claim_log enable row level security;  -- 정책 없음

create or replace function public.retire_number_claim(p_token text, p_game text, p_hof_id text,
                                                      p_beta_data jsonb default null)
returns table (r_status text, r_club text, r_no int, r_seq bigint, r_holder text)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_who text; v_n int; v_rows int;
  v_data jsonb; v_club text; v_no int; v_seasons int; v_name text;
begin
  if p_token is null or length(p_token) < 16 then raise exception '토큰이 올바르지 않아요'; end if;
  if p_game not in ('soccer', 'beta:soccer') then raise exception '게임이 올바르지 않아요'; end if;
  v_who := encode(digest(p_token, 'sha256'), 'hex');
  select count(*) into v_n from public.retire_claim_log l
   where l.who = v_who and l.at > now() - interval '1 day';
  if v_n >= 5 then raise exception '오늘은 더 신청할 수 없어요'; end if;
  insert into public.retire_claim_log (who, game, hof_id) values (v_who, p_game, p_hof_id);

  -- 자격은 **명전 행**이 말한다 — 클라이언트가 넘긴 클럽·번호를 믿지 않는다.
  -- 베타는 명전이 원격에 없어서(match.js가 베타에서 끔) 넘겨받은 요약을 쓴다
  if p_game = 'soccer' then
    select h.data into v_data from public.hof h where h.id = p_hof_id and h.game = 'soccer';
  else
    v_data := p_beta_data;
  end if;
  if v_data is null then raise exception '명예의 전당에 없는 기록이에요'; end if;

  v_club    := v_data->'home'->>'club';
  v_seasons := case when v_data->'home'->>'seasons' ~ '^\d{1,2}$' then (v_data->'home'->>'seasons')::int else 0 end;
  v_no      := case when v_data->>'no' ~ '^\d{1,2}$' then (v_data->>'no')::int else null end;
  v_name    := case when v_data->>'anon' = 'true' then null else public._soccer_name(v_data->>'name') end;
  if v_club is null or v_no is null then raise exception '결번할 클럽·번호가 없어요'; end if;
  if v_seasons < 5 then raise exception '한 클럽 5시즌부터 결번할 수 있어요'; end if;

  -- 이미 받은 기록이면 같은 답 (재시도에 안전)
  if exists (select 1 from public.retired_no r where r.game = p_game and r.hof_id = p_hof_id) then
    return query select 'number'::text, r.club, r.no, r.seq, r.name
                   from public.retired_no r where r.game = p_game and r.hof_id = p_hof_id;
    return;
  end if;
  insert into public.retired_no (game, club, no, hof_id, name)
       values (p_game, v_club, v_no, p_hof_id, v_name)
  on conflict do nothing;                                     -- (game, club, no) · (game, hof_id) 어느 쪽이 겹쳐도
  get diagnostics v_rows = row_count;
  if v_rows = 1 then
    return query select 'number'::text, r.club, r.no, r.seq, r.name
                   from public.retired_no r where r.game = p_game and r.hof_id = p_hof_id;
    return;
  end if;
  insert into public.retired_wall (game, club, no, hof_id, name)
       values (p_game, v_club, v_no, p_hof_id, v_name)
  on conflict (game, hof_id) do nothing;
  return query select 'wall'::text, v_club, v_no, null::bigint,
    (select r.name from public.retired_no r where r.game = p_game and r.club = v_club and r.no = v_no);
end; $$;
grant execute on function public.retire_number_claim(text, text, text, jsonb) to anon;

create or replace function public.retired_no_hide(p_pw text, p_game text, p_club text, p_no int) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public._soccer_admin_ok(p_pw) then raise exception '권한이 없어요'; end if;
  update public.retired_no set name = null where game = p_game and club = p_club and no = p_no;
end; $$;
create or replace function public.retired_no_clear(p_pw text, p_game text, p_club text, p_no int) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare w record;
begin
  if not public._soccer_admin_ok(p_pw) then raise exception '권한이 없어요'; end if;
  delete from public.retired_no where game = p_game and club = p_club and no = p_no;
  -- 벽의 가장 이른 줄이 올라온다
  select * into w from public.retired_wall
   where game = p_game and club = p_club and no = p_no order by at limit 1;
  if found then
    delete from public.retired_wall where id = w.id;
    insert into public.retired_no (game, club, no, hof_id, name) values (w.game, w.club, w.no, w.hof_id, w.name);
  end if;
end; $$;
grant execute on function public.retired_no_hide(text, text, text, int)  to anon;
grant execute on function public.retired_no_clear(text, text, text, int) to anon;

-- 5) 🔗 공유 링크의 필름 — hof와 같은 규칙(넣기만, 고치기·지우기 없음)
create table if not exists public.hof_film (
  id   text        primary key,                                    -- hof.id 와 같다 ("soccer-w…")
  game text        not null check (game in ('soccer', 'beta:soccer')),
  film jsonb       not null check (pg_column_size(film) <= 6144),
  at   timestamptz not null default now()
);
alter table public.hof_film enable row level security;
create policy "hof_film read" on public.hof_film for select using (true);
create policy "hof_film insert" on public.hof_film for insert with check (
  game in ('soccer', 'beta:soccer') and pg_column_size(film) <= 6144
  and (game = 'beta:soccer' or exists (select 1 from public.hof h where h.id = hof_film.id and h.game = 'soccer'))
);

-- 6) 🟢 라이브 — 집계만 내보내는 함수 하나
create index if not exists cloud_save_game_updated on public.cloud_save (game, updated desc);

create or replace function public.soccer_live(p_game text default 'soccer') returns json
language sql stable security definer set search_path = public as $$
  with d as (select (date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul') as t)
  select json_build_object(
    'playing', (select count(*) from public.cloud_save s
                 where s.game = p_game and s.updated > now() - interval '10 minutes'),
    'new',     (select count(*) from public.events e, d
                 where p_game = 'soccer' and e.game = 'soccer' and e.event = 'new_player' and e.ts >= d.t),
    'seasons', (select count(*) from public.events e, d
                 where p_game = 'soccer' and e.game = 'soccer' and e.event = 'year_end'   and e.ts >= d.t),
    'retired', (select count(*) from public.events e, d
                 where p_game = 'soccer' and e.game = 'soccer' and e.event = 'retire'     and e.ts >= d.t),
    'lines', coalesce((select json_agg(x) from (
        select case when h.data->>'anon' = 'true' then null else public._soccer_name(h.data->>'name') end as name,
               left(h.data->>'grade', 40)                                                             as grade,
               case when h.data->>'score' ~ '^\d{1,6}$' then (h.data->>'score')::int end              as score,
               (h.data->>'at')::bigint                                                                as at
          from public.hof h
         where p_game = 'soccer' and h.game = 'soccer' and h.data->>'at' ~ '^\d{12,14}$'
         order by (h.data->>'at')::bigint desc
         limit 6) x), '[]'::json)
  );
$$;
grant execute on function public.soccer_live(text) to anon;

-- ── 되돌리기 (필요할 때) ────────────────────────────────────────────────────
-- drop function if exists public.soccer_live(text);
-- drop policy if exists "hof_film insert" on public.hof_film; drop policy if exists "hof_film read" on public.hof_film;
-- drop table if exists public.hof_film;
-- drop function if exists public.retired_no_clear(text, text, text, int), public.retired_no_hide(text, text, text, int),
--   public.retire_number_claim(text, text, text, jsonb);
-- drop table if exists public.retire_claim_log, public.retired_wall, public.retired_no;
-- drop function if exists public.ach_first_clear(text, text, text), public.ach_first_hide(text, text, text),
--   public.ach_first_claim(text, text, text, text);
-- drop table if exists public.ach_claim_log, public.ach_first;
-- drop function if exists public._soccer_name(text), public._soccer_admin_ok(text);
-- drop table if exists public.admin_secret;
-- drop index if exists public.cloud_save_game_updated;
```

**초안에서 검토가 필요한 자리(engineer · inspector에게)**
- `_soccer_name`의 정규식(대괄호 안 `\\`·`[:cntrl:]`)은 **Postgres ARE에서 한 번 실제로 돌려** 태그 글자·줄바꿈·링크가 걸리는지 확인할 것
- `hof_film` 삽입 정책의 `exists (… hof …)`는 `hof`의 select 정책이 열려 있어야 동작한다(0번 확인 쿼리)
- `pg_column_size`의 6KB는 필름 요약 실측(12번 B-3 모양으로 15시즌 커리어 한 편)을 보고 여유를 다시 잡는다
- 클라이언트 쪽 명전 id는 `"soccer-" + entry.id`(`match.js:169`) — `retire_number_claim`과 링크가 **그 id**를 쓴다

---

## 수치와 그 근거

> ⚠️ 전부 **제안**. D는 밸런스가 아니라 운영 수치다 — 실측 대신 **첫 주 운영 로그**로 다시 본다.

| 이름(제안) | 값 | 맞바꾸는 것 |
|---|---|---|
| 최초 기록 하루 상한(기기당) | 60 | 한 커리어에 업적이 몰리는 날(소급 포함) ↔ 스크립트 남용 |
| 결번 신청 하루 상한(기기당) | 5 | 은퇴는 하루 몇 번이 고작 ↔ 가짜 명전 행으로 결번 선점 |
| 결번 자격 | 한 클럽 5시즌 | 판단 15 — "그 클럽의 사람" |
| 라이브 창 | 10분 | 자동 백업 간격(20초)의 30배 — 한 판 뛰는 동안 한 번은 올라간다 |
| 라이브 줄 | 6 | 타이틀이 길어지지 않게 |
| 라이브 캐시 | 60초 | 타이틀을 여러 번 오가도 한 번 |
| 최초 기록 읽기 캐시 | 10분 | 도감을 열 때마다 두드리지 않게 |
| 이름 길이 | 12자 | 게임 입력 칸 8자(`index.html` `maxlength="8"`)에 여유 |
| 필름 크기 | 6KB | 15시즌 한 편 ≈ 2~4KB(추정) |

---

## 저장 데이터

**클라이언트(마이그레이션 없음)**

| 필드 | 기본값 | 비고 |
|---|---|---|
| 기기 장부 `book.pend` | `[]` | 올릴 최초 기록 대기열 |
| 기기 장부 `book.first` | `{}` | `{ [ach]: {mine, name, at} }` — 받은 답 |
| 기기 설정 `winger-name-public` | 켬 | 판단 14 |
| 명전 항목 `anon` | 없음 → 공개 | 켜진 채 올라간 옛 항목은 그대로 |
| 명전 항목 `noSent` | 없음 → 신청 대상 아님(자격 필드 `home`·`no`가 없는 옛 항목) | `false`면 다음에 다시 |
| 명전 항목 `filmSent` | 없음 → 대상 아님 | `hof_film` 올리기 대기 |

**서버(새 표 — 전부 `game` 칼럼으로 상용·베타 분리)**: `ach_first` · `ach_claim_log`(비공개) · `retired_no` · `retired_wall` ·
`retire_claim_log`(비공개) · `hof_film` · `admin_secret`(비공개) · 함수 `soccer_live`. **기존 표는 건드리지 않는다**(인덱스 하나 — `cloud_save`).

---

## 하지 않은 것

| 뺀 것 | 왜 | 판단이 바뀔 조건 |
|---|---|---|
| 구글 로그인 · 계정 동기화 · 댓글 · 게시판 | 사용자가 고른 D에 없다(`01_request.md`) | 사용자 요청 |
| 서버가 판정하는 레전드 심사 | 클라이언트 게임이라 서버가 **진짜 기록**을 알 길이 없다 — 심사하는 척이 된다 | 서버 시뮬레이션이 생기면 |
| 실시간 알림(푸시·웹소켓) | 정적 페이지. 피버도 "화면이 바뀔 때 확인"으로 풀었다 | — |
| 관리 화면에서 이벤트 확률·병역 합격률 조정 | 운영 손잡이가 **쌓이는** 커리어 밸런스를 오염시킨다(피버는 쌓이지 않는다) | — |
| 공유 링크 미리보기 이미지(OG) | 정적 호스팅이라 링크마다 다른 미리보기를 못 만든다 — 미리보기는 게임 공용 | 서버 렌더링이 생기면 |
| 결번된 번호를 데뷔 때 못 고르게 | 데뷔 클럽의 결번 목록을 서버에서 읽어야 하고, 오프라인이면 판정이 흔들린다 | 결번 벽이 인기 기능이 되면 |
| 최초 기록의 위조 차단 | 클라이언트 게임 — 원천 차단은 불가능. 상한·가리기·로그로 대응하고 **숨기지 않는다** | — |
| 기존 `fever_*`·`hof_word_clear` 비밀번호 방식 변경 | 이번 범위 밖 · 되는 것을 건드리지 않는다 | 비밀번호를 바꿀 일이 생기면 그때 `admin_secret`으로 |

---

## 위험 — 무엇이 무너지면 이 설계가 실패인가

1. **XSS가 새 표면으로 샌다** — 네 표면 × 세 겹 중 한 겹이라도 빠지면. → 표면마다 변이 검증(그리는 길의 `esc` 제거 → 태그가 DOM에 들어가면 빨간불).
   서버 정리 함수는 **실제 Postgres에서** 한 번 돌려 본다
2. **개인정보** — 토큰 원문·기기 id가 공개 칼럼이나 라이브 응답에 섞이면. → 비공개 값은 **다른 표**(정책 없음), 라이브는 **집계 숫자와 명전에 이미 공개된 값만**
3. **남용** — 가짜 명전 행으로 결번 선점, 스크립트로 최초 기록 싹쓸이. → 기기당 하루 상한 + 명전 행 기반 자격 판정 + 관리 가리기/지우기(벽 승격). **숨기지 않고 규칙 쪽에 적는다**
4. **"UPDATE 없음"이 무너진다** — 결번 결과를 명전 행에 되쓰고 싶어진다. → 결과는 **별도 표**만. 새 정책에 `for update`가 하나라도 있으면 검토에서 막는다
5. **SQL이 반쯤 적용된다** — 표는 있는데 함수가 없거나. → 클라이언트는 404·오류마다 **그 칸만** 숨긴다. 검사: 표 없음·함수 없음·둘 다 있음 세 모양의 가짜 응답으로 화면
6. **베타가 상용을 오염시킨다** — 태그를 빠뜨린 호출 하나. → 모든 쓰기 RPC가 `game`을 **서버에서** 두 값으로만 받는다(CHECK) · 검사: 베타 페이지의 모든 요청 본문에 `beta:soccer`
7. **라이브 함수가 느려진다** — `events`는 계속 자란다. → 인덱스(`events_game_ts`는 이미 있다, `stats.js:14`) · `cloud_save (game, updated)` 인덱스 추가 · 타이틀 한 번·60초 캐시
8. **스키마를 모른 채 적용한다** — 명전·피버 표의 DDL은 저장소에 없다. → 0번 확인 쿼리를 먼저, 결과를 `_workspace/soccer/`에 남긴다
