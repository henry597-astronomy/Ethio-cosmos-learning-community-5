from pathlib import Path
from PIL import Image, ImageChops, ImageOps

SOURCE = Path('/home/ubuntu/upload/1000078381.jpg')
RES = Path('/home/ubuntu/ethio-tutor-work/android/app/src/main/res')

# Android legacy launcher densities and adaptive foreground canvas sizes.
DENSITIES = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192,
}
FOREGROUND_SIZES = {
    'mdpi': 108,
    'hdpi': 162,
    'xhdpi': 216,
    'xxhdpi': 324,
    'xxxhdpi': 432,
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

    foreground_size = FOREGROUND_SIZES[density]
    foreground = ImageOps.contain(canvas, (foreground_size, foreground_size), method=Image.Resampling.LANCZOS)
    foreground_canvas = Image.new('RGBA', (foreground_size, foreground_size), (5, 9, 24, 255))
    foreground_canvas.alpha_composite(foreground, ((foreground_size - foreground.width) // 2, (foreground_size - foreground.height) // 2))
    foreground_canvas.save(RES / f'mipmap-{density}' / 'ic_launcher_foreground.png', format='PNG', optimize=True)

print(f'Prepared launcher icons from {SOURCE.name}; trimmed source bounds={bbox}; square={side}px')
