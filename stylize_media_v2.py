from pathlib import Path
import cv2
import numpy as np
import onnxruntime as ort

ROOT = Path('/Users/vasiliy/Documents/New project')
SRC = ROOT / 'assets' / 'client'
OUT = ROOT / 'assets' / 'client-drawn-v2'
MODEL = ROOT / 'models' / 'cartoonizer.onnx'
OUT.mkdir(parents=True, exist_ok=True)

session = ort.InferenceSession(str(MODEL), providers=['CPUExecutionProvider'])
IN_NAME = session.get_inputs()[0].name
OUT_NAME = session.get_outputs()[0].name


def infer_cartoon(frame_bgr):
    h, w = frame_bgr.shape[:2]
    pad_h = (8 - (h % 8)) % 8
    pad_w = (8 - (w % 8)) % 8

    if pad_h or pad_w:
        padded = cv2.copyMakeBorder(
            frame_bgr,
            0,
            pad_h,
            0,
            pad_w,
            borderType=cv2.BORDER_REFLECT_101,
        )
    else:
        padded = frame_bgr

    rgb = cv2.cvtColor(padded, cv2.COLOR_BGR2RGB).astype(np.float32)
    x = np.expand_dims(rgb / 255.0, axis=0)
    y = session.run([OUT_NAME], {IN_NAME: x})[0][0]

    # Clamp and convert back.
    y = np.clip(y, 0.0, 1.0)
    out_rgb = (y * 255.0).astype(np.uint8)
    out = cv2.cvtColor(out_rgb, cv2.COLOR_RGB2BGR)

    if pad_h or pad_w:
        out = out[:h, :w]

    # Subtle premium grade, keep whites clean.
    b, g, r = cv2.split(out)
    r = cv2.add(r, 6)
    g = cv2.subtract(g, 2)
    out = cv2.merge((b, g, r))

    # Mild crispness.
    blur = cv2.GaussianBlur(out, (0, 0), 0.8)
    out = cv2.addWeighted(out, 1.06, blur, -0.06, 0)
    return out


def process_images():
    for i in range(1, 7):
        src = SRC / f'photo-{i}.webp'
        img = cv2.imread(str(src), cv2.IMREAD_COLOR)
        if img is None:
            print(f'[MISS IMG] {src}')
            continue
        out = infer_cartoon(img)
        dst = OUT / f'photo-{i}-drawn-v2.webp'
        cv2.imwrite(str(dst), out, [cv2.IMWRITE_WEBP_QUALITY, 99])
        print(f'[IMG] {src.name} -> {dst.name}')


def process_video(src_name, dst_name):
    src = SRC / src_name
    cap = cv2.VideoCapture(str(src))
    if not cap.isOpened():
        print(f'[MISS VID] {src}')
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    tmp = OUT / (dst_name + '.tmp.mp4')
    dst = OUT / dst_name

    writer = cv2.VideoWriter(
        str(tmp),
        cv2.VideoWriter_fourcc(*'mp4v'),
        fps,
        (w, h),
    )

    prev = None
    idx = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break

        styl = infer_cartoon(frame)

        # Tiny temporal smoothing to reduce flicker.
        if prev is not None:
            styl = cv2.addWeighted(styl, 0.9, prev, 0.1, 0)
        prev = styl

        writer.write(styl)
        idx += 1
        if idx % 20 == 0:
            print(f'[VID] {src.name}: {idx}/{max(total,1)}')

    cap.release()
    writer.release()

    if dst.exists():
        dst.unlink()
    tmp.rename(dst)
    print(f'[VID] {src.name} -> {dst.name} ({idx}/{total} frames)')


def validate_video(name):
    p = OUT / name
    cap = cv2.VideoCapture(str(p))
    if not cap.isOpened():
        print(f'[FAIL] validate {name}')
        return
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()
    print(f'[OK] {name}: {n} frames, {fps:.2f} fps, {w}x{h}')


if __name__ == '__main__':
    print('Process images...')
    process_images()
    print('Process videos...')
    process_video('lepka.mp4', 'lepka-drawn-v2.mp4')
    process_video('upakovka.mp4', 'upakovka-drawn-v2.mp4')
    print('Validate...')
    validate_video('lepka-drawn-v2.mp4')
    validate_video('upakovka-drawn-v2.mp4')
    print('Done.')
