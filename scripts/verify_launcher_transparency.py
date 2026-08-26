from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
paths = sorted((root / 'android/app/src/main/res').glob('mipmap-*/ethio_telescope_launcher*.png'))
paths.append(root / 'android/app/src/main/res/drawable-nodpi/ethio_telescope_launcher_foreground.png')

for path in paths:
    image = Image.open(path).convert('RGBA')
    alpha = image.getchannel('A')
    corners = [alpha.getpixel(point) for point in ((0, 0), (image.width - 1, 0), (0, image.height - 1), (image.width - 1, image.height - 1))]
    if any(corner != 0 for corner in corners):
        raise SystemExit(f'{path}: corner alpha is not transparent: {corners}')
    print(f'{path}: {image.size[0]}x{image.size[1]}, corners alpha={corners}')
