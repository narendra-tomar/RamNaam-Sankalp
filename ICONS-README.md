# App Icons Setup

The app works fine without icons, but for a proper PWA install experience (especially on mobile), you should add:

- `icons/icon-192.png` (192×192 pixels)
- `icons/icon-512.png` (512×512 pixels)

## Quick Option: Generate Placeholder Icons

### Using an online tool (easiest):

1. Go to https://www.favicon-generator.org/
2. Upload or create a simple image with:
   - Background: #d97b2e (saffron)
   - Foreground: "राम" or a simple ॐ symbol
   - OR just text "RN" (RamNaam initials)
3. Download PNG files
4. Save as `icons/icon-192.png` and `icons/icon-512.png`

### Using ImageMagick (if installed):

```bash
# Create a simple text-based icon
convert -size 192x192 xc:'#d97b2e' -fill white -pointsize 80 -gravity center -annotate +0+0 "राम" icons/icon-192.png

convert -size 512x512 xc:'#d97b2e' -fill white -pointsize 200 -gravity center -annotate +0+0 "राम" icons/icon-512.png
```

### Using Python (PIL/Pillow):

```python
from PIL import Image, ImageDraw, ImageFont

# Create 192x192 icon
img = Image.new('RGB', (192, 192), color='#d97b2e')
draw = ImageDraw.Draw(img)
draw.text((96, 96), "राम", fill="white")
img.save('icons/icon-192.png')

# Create 512x512 icon
img = Image.new('RGB', (512, 512), color='#d97b2e')
draw = ImageDraw.Draw(img)
draw.text((256, 256), "राम", fill="white")
img.save('icons/icon-512.png')
```

### Professional Option:

Create a simple design in Figma (free) or Canva:
- Saffron background (#d97b2e)
- White text: "राम" or "RN"
- Export as PNG at 192×192 and 512×512

## Without Icons

The app will still:
- Work 100% normally
- Sync data
- Install as PWA
- Just won't have a custom icon on home screen (will use browser default)

Once deployed, you can add icons anytime and Firebase/Vercel/Netlify will auto-update all users.
