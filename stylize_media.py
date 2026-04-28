from pathlib import Path
import cv2
import numpy as np

ROOT = Path('/Users/vasiliy/Documents/New project')
SRC = ROOT / 'assets' / 'client'
OUT = ROOT / 'assets' / 'client-illustrated'
OUT.mkdir(parents=True, exist_ok=True)


def stylize_fast(img_bgr):
    # Smooth like painted surface.
    smooth = cv2.bilateralFilter(img_bgr, d=7, sigmaColor=52, sigmaSpace=52)

    # Fast posterization (illustration look).
    levels = 22
    poster = (smooth // levels) * levels + levels // 2
    poster = np.clip(poster, 0, 255).astype(np.uint8)

    # Draw contour lines.
    gray = cv2.cvtColor(smooth, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(gray, 70, 135)
    edges = cv2.dilate(edges, np.ones((2, 2), np.uint8), iterations=1)
    edges = cv2.bitwise_not(edges)
    edge3 = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)

    out = cv2.addWeighted(poster, 0.90, edge3, 0.18, 0)

    # Slight premium color grading (warm red bias, clean whites).
    b, g, r = cv2.split(out)
    r = cv2.add(r, 6)
    g = cv2.subtract(g, 2)
    out = cv2.merge((b, g, r))

    # Gentle clarity.
    blur = cv2.GaussianBlur(out, (0, 0), 1.2)
    out = cv2.addWeighted(out, 1.12, blur, -0.12, 0)

    return out


def process_images():
    for i in range(1, 7):
        src = SRC / f'photo-{i}.webp'
        if not src.exists():
            print(f'[MISS] {src}')
            continue
        img = cv2.imread(str(src), cv2.IMREAD_COLOR)
        if img is None:
            print(f'[FAIL] read {src}')
            continue
        styl = stylize_fast(img)
        dst = OUT / f'photo-{i}-illustrated.webp'
        cv2.imwrite(str(dst), styl, [cv2.IMWRITE_WEBP_QUALITY, 97])
        print(f'[IMG] {src.name} -> {dst.name}')


def process_video(src_name, dst_name):
    src = SRC / src_name
    if not src.exists():
        print(f'[MISS] {src}')
        return

    cap = cv2.VideoCapture(str(src))
    if not cap.isOpened():
        print(f'[FAIL] open {src}')
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    tmp = OUT / (dst_name + '.tmp.mp4')
    dst = OUT / dst_name

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    writer = cv2.VideoWriter(str(tmp), fourcc, fps, (w, h))

    count = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        writer.write(stylize_fast(frame))
        count += 1

    cap.release()
    writer.release()

    if dst.exists():
        dst.unlink()
    tmp.rename(dst)
    print(f'[VID] {src.name} -> {dst.name} ({count}/{total} frames)')


def validate_video(name):
    p = OUT / name
    cap = cv2.VideoCapture(str(p))
    if not cap.isOpened():
        print(f'[FAIL] validate {name}')
        return False
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()
    print(f'[OK ] {name}: {n} frames, {fps:.2f} fps, {w}x{h}')
    return True


if __name__ == '__main__':
    print('Stylize images...')
    process_images()
    print('Stylize videos...')
    process_video('lepka.mp4', 'lepka-illustrated.mp4')
    process_video('upakovka.mp4', 'upakovka-illustrated.mp4')
    print('Validate...')
    validate_video('lepka-illustrated.mp4')
    validate_video('upakovka-illustrated.mp4')
    print('Done.')
