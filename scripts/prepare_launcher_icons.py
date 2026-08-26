from pathlib import Path
from PIL import Image, ImageChops, ImageOps

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT_ROOT / 'public/images/app-icon-source.jpg'
RES = PROJECT_ROOT / 'android/app/src/main/res'

# Android legacy launcher densities used by the explicit manifest icon resources.
DENSITIES = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192,
}

image = Image.open(SOURCE).convert('RGBA')
# Remove only the near-white border around the supplied artwork. The artwork itself
# is preserved; this is not a redraw or semantic edit.
rgb = image.convert('RGB')
white = Image.new('RGB', rgb.size, (255, 255, 255))
difference = ImageChops.difference(rgb, white).convert('L')
mask = difference.point(lambda value: 255 if value > 12 else 0)
bbox = mask.getbbox()
if bbox is None:
    raise RuntimeError('Could not locate non-white logo artwork')

artwork = image.crop(bbox)
side = max(artwork.width, artwork.height)
canvas = Image.new('RGBA', (side, side), (5, 9, 24, 255))
canvas.alpha_composite(artwork, ((side - artwork.width) // 2, (side - artwork.height) // 2))

for density, size in DENSITIES.items():
    target = ImageOps.contain(canvas, (size, size), method=Image.Resampling.LANCZOS)
    square = Image.new('RGBA', (size, size), (5, 9, 24, 255))
    square.alpha_composite(target, ((size - target.width) // 2, (size - target.height) // 2))
    for filename in ('ic_launcher.png', 'ic_launcher_round.png'):
        output = RES / f'mipmap-{density}' / filename
        output.parent.mkdir(parents=True, exist_ok=True)
        square.save(output, format='PNG', optimize=True)

print(f'Prepared launcher icons from {SOURCE.name}; trimmed source bounds={bbox}; square={side}px')
