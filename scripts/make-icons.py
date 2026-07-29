#!/usr/bin/env python3
"""PWA 아이콘 생성기.

셰프·개발자·축구·주식 네 게임이 아이돌의 마이크 아이콘을 그대로 복사해 쓰고 있었어요.
홈 화면에 여러 개를 깔면 전부 같은 아이콘이라 구분이 안 됐습니다.

이모지 폰트가 컨테이너에 없어서 Pillow로 직접 그려요. 기존 고유 아이콘
(⚾ 더 드래프트 · 📹 스트리머 · 🦄 유니콘)의 양식을 따릅니다 —
테마색 방사형 그라디언트 배경, 가운데 평면 일러스트, 부드러운 그림자.

    python3 scripts/make-icons.py            # 베타·상용 양쪽에 씀
    python3 scripts/make-icons.py --preview  # /tmp에만 그려서 눈으로 확인
"""

import argparse
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

SIZES = (192, 512)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 게임별 테마색 — manifest.webmanifest의 theme_color와 같아요.
THEMES = {
    "soccer": "#0b1e14",
    "chef": "#2a1410",
    "dev": "#0d1117",
    "stock": "#0c1a14",
}


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def scale(rgb, f):
    return tuple(min(255, int(c * f)) for c in rgb)


def background(size, theme):
    """중심이 밝은 방사형 그라디언트. 기존 아이콘을 재보니 대략 1.25배(모서리)
    에서 1.75배(중심) 사이였어요."""
    base = hex_rgb(theme)
    inner, outer = scale(base, 1.75), scale(base, 1.25)
    im = Image.new("RGB", (size, size), outer)
    px = im.load()
    c = size / 2
    maxd = math.hypot(c, c)
    for y in range(size):
        for x in range(size):
            d = math.hypot(x - c, y - c) / maxd
            t = min(1.0, d * 1.15)
            px[x, y] = tuple(
                int(inner[i] + (outer[i] - inner[i]) * t) for i in range(3)
            )
    return im


def with_shadow(layer, size, blur, dy):
    """피사체 알파에서 그림자를 떠서 아래로 살짝 내려요."""
    a = layer.split()[3]
    sh = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sh.putalpha(a.filter(ImageFilter.GaussianBlur(blur)))
    sh = Image.new("RGBA", (size, size), (0, 0, 0, 110))
    sh.putalpha(a.filter(ImageFilter.GaussianBlur(blur)).point(lambda v: int(v * 0.45)))
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(sh, (0, int(dy)), sh)
    out.alpha_composite(layer)
    return out


# ---------- 게임별 피사체 ----------

CREAM = (241, 237, 236, 255)
CREAM_SH = (206, 200, 199, 255)


def draw_soccer(d, s):
    """축구공 — 크림색 구에 오각형 무늬. 무늬는 원 밖으로 안 삐져나가게 잘라내요."""
    c, r = s / 2, s * 0.30
    d.ellipse([c - r, c - r, c + r, c + r], fill=CREAM)

    dark = (38, 46, 42, 255)
    size = int(s)
    patt = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pd = ImageDraw.Draw(patt)

    def poly(cx, cy, rad, rot):
        pts = [
            (cx + rad * math.cos(math.radians(rot + i * 72)),
             cy + rad * math.sin(math.radians(rot + i * 72)))
            for i in range(5)
        ]
        pd.polygon(pts, fill=dark)

    poly(c, c, r * 0.32, -90)
    for i in range(5):
        a = math.radians(-90 + i * 72)
        poly(c + math.cos(a) * r * 0.74, c + math.sin(a) * r * 0.74, r * 0.21, -90 + i * 72 + 36)

    # 공 밖으로 나간 부분을 잘라내요 — 안 그러면 원 가장자리가 들쭉날쭉해집니다.
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse([c - r, c - r, c + r, c + r], fill=255)
    patt.putalpha(Image.composite(patt.split()[3], Image.new("L", (size, size), 0), mask))
    d._image.alpha_composite(patt)

    # 아래쪽 음영 — 각진 경계가 안 생기게 부드럽게 깔아요.
    sh = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse(
        [c - r * 1.05, c - r * 0.15, c + r * 1.05, c + r * 1.6], fill=(0, 0, 0, 46)
    )
    sh = sh.filter(ImageFilter.GaussianBlur(s * 0.03))
    sh.putalpha(Image.composite(sh.split()[3], Image.new("L", (size, size), 0), mask))
    d._image.alpha_composite(sh)


def draw_chef(d, s):
    """셰프 모자 — 부푼 윗부분 세 덩이와 아래 띠."""
    c = s / 2
    top = s * 0.40
    # 부푼 부분
    for cx, cy, rr in (
        (c - s * 0.135, top + s * 0.045, s * 0.115),
        (c + s * 0.135, top + s * 0.045, s * 0.115),
        (c, top - s * 0.015, s * 0.135),
    ):
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=CREAM)
    # 모자 몸통
    d.rounded_rectangle(
        [c - s * 0.175, top + s * 0.02, c + s * 0.175, c + s * 0.115],
        radius=s * 0.03, fill=CREAM,
    )
    # 띠
    d.rounded_rectangle(
        [c - s * 0.185, c + s * 0.085, c + s * 0.185, c + s * 0.185],
        radius=s * 0.025, fill=CREAM_SH,
    )
    # 띠 주름
    for i in range(-1, 2):
        x = c + i * s * 0.105
        d.line([(x, c + s * 0.10), (x, c + s * 0.17)], fill=(180, 173, 172, 255), width=max(1, int(s * 0.008)))


def draw_dev(d, s):
    """터미널 창 — 프롬프트가 보이는 화면."""
    c = s / 2
    w, h = s * 0.34, s * 0.25
    scr = [c - w, c - h * 1.05, c + w, c + h * 0.75]
    d.rounded_rectangle(scr, radius=s * 0.035, fill=(226, 232, 240, 255))
    inner = [scr[0] + s * 0.022, scr[1] + s * 0.055, scr[2] - s * 0.022, scr[3] - s * 0.022]
    d.rounded_rectangle(inner, radius=s * 0.018, fill=(22, 28, 38, 255))
    # 상단 점 세 개
    for i, col in enumerate([(237, 106, 94), (245, 191, 79), (98, 197, 84)]):
        cx = scr[0] + s * 0.045 + i * s * 0.038
        rr = s * 0.012
        d.ellipse([cx - rr, scr[1] + s * 0.028 - rr, cx + rr, scr[1] + s * 0.028 + rr], fill=col + (255,))
    # 프롬프트 >_
    lw = max(2, int(s * 0.018))
    ax, ay = inner[0] + s * 0.042, (inner[1] + inner[3]) / 2
    d.line([(ax, ay - s * 0.035), (ax + s * 0.042, ay), (ax, ay + s * 0.035)],
           fill=(122, 226, 160, 255), width=lw, joint="curve")
    d.line([(ax + s * 0.065, ay + s * 0.038), (ax + s * 0.145, ay + s * 0.038)],
           fill=(122, 226, 160, 255), width=lw)
    # 받침
    d.rounded_rectangle([c - w * 1.18, scr[3] + s * 0.012, c + w * 1.18, scr[3] + s * 0.048],
                        radius=s * 0.018, fill=(186, 194, 208, 255))


def draw_stock(d, s):
    """우상향 차트 — 봉과 꺾은선, 끝에 화살표. 가운데에 오게 좌우를 맞춰요."""
    c = s / 2
    step = s * 0.098
    heights = (0.11, 0.19, 0.15, 0.29, 0.38)
    span = step * (len(heights) - 1)
    left = c - span / 2
    base = c + s * 0.20
    bar_w = s * 0.058
    for i, hgt in enumerate(heights):
        x = left + i * step
        col = (70, 104, 86, 255) if i % 2 == 0 else (58, 90, 74, 255)
        d.rounded_rectangle([x - bar_w / 2, base - s * hgt, x + bar_w / 2, base],
                            radius=s * 0.013, fill=col)
    pts = [(left + i * step, base - s * (h + 0.045)) for i, h in enumerate(heights)]
    lw = max(3, int(s * 0.030))
    d.line(pts, fill=(122, 226, 160, 255), width=lw, joint="curve")
    for p in pts:
        rr = lw * 0.60
        d.ellipse([p[0] - rr, p[1] - rr, p[0] + rr, p[1] + rr], fill=(122, 226, 160, 255))
    ex, ey = pts[-1]
    d.polygon([(ex + s * 0.082, ey - s * 0.050), (ex - s * 0.010, ey - s * 0.058),
               (ex + s * 0.034, ey + s * 0.030)], fill=(122, 226, 160, 255))
    d.line([(left - s * 0.062, base + s * 0.014), (left + span + s * 0.062, base + s * 0.014)],
           fill=(104, 128, 114, 255), width=max(2, int(s * 0.013)))


DRAW = {"soccer": draw_soccer, "chef": draw_chef, "dev": draw_dev, "stock": draw_stock}


def make(game, size):
    bg = background(size, THEMES[game]).convert("RGBA")
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    DRAW[game](ImageDraw.Draw(layer), size)
    layer = with_shadow(layer, size, blur=size * 0.022, dy=size * 0.018)
    bg.alpha_composite(layer)
    return bg.convert("RGB")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", action="store_true", help="/tmp에만 그려요")
    ap.add_argument("games", nargs="*", default=sorted(THEMES))
    args = ap.parse_args()

    out_dirs = ["/tmp/icon-preview"] if args.preview else [
        os.path.join(ROOT, ""), os.path.join(ROOT, "beta")
    ]
    for d in out_dirs:
        os.makedirs(d, exist_ok=True)

    for game in args.games:
        if game not in THEMES:
            sys.exit(f"모르는 게임: {game}")
        for size in SIZES:
            im = make(game, size)
            for d in out_dirs:
                path = (os.path.join(d, f"{game}-{size}.png") if args.preview
                        else os.path.join(d, game, f"icon-{size}.png"))
                im.save(path, optimize=True)
                print("wrote", path)


if __name__ == "__main__":
    main()
