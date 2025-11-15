# Boss Sprite Files for Touhou Mini Game

This directory should contain sprite images for the 3 bosses.

## Required Files:

### boss1.png - Stage 1: Marisa
- **Size:** 273x138 pixels (8 frames: 2 rows x 4 frames)
- **Layout:** 2-row sprite sheet (4 frames per row)
- **Animation:** Idle/floating animation (8 frames total)
- **Style:** Girl with blonde hair and blue dress
- **Frame size:** 68x69 pixels each

### boss2.png - Stage 2: Elly
- **Size:** 271x135 pixels (8 frames: 2 rows x 4 frames)
- **Layout:** 2-row sprite sheet (4 frames per row)
- **Animation:** Idle + attack animation with magic effects (8 frames total)
- **Style:** Girl with blonde hair, red dress, and magic wand
- **Frame size:** 68x67 pixels each

### boss3.png - Stage 3: Alice
- **Size:** 273x70 pixels (4 frames: 1 row x 4 frames)
- **Layout:** Single-row sprite sheet (4 frames in a row)
- **Animation:** Idle animation with magical effects (4 frames total)
- **Style:** Magical doll user character with elegant dress
- **Frame size:** 68x70 pixels each

## Sprite Sheet Format:

### Boss 1 (8 frames):
```
Row 1: Frame 0 | Frame 1 | Frame 2 | Frame 3
       [68x69] | [68x69] | [68x69] | [68x69]
Row 2: Frame 4 | Frame 5 | Frame 6 | Frame 7
       [68x69] | [68x69] | [68x69] | [68x69]
```
Total size: 273x138 pixels

### Boss 2 (8 frames):
```
Row 1: Frame 0 | Frame 1 | Frame 2 | Frame 3
       [68x67] | [68x67] | [68x67] | [68x67]
Row 2: Frame 4 | Frame 5 | Frame 6 | Frame 7
       [68x67] | [68x67] | [68x67] | [68x67]
```
Total size: 271x135 pixels

### Boss 3 (4 frames):
```
Frame 0 | Frame 1 | Frame 2 | Frame 3
[68x70] | [68x70] | [68x70] | [68x70]
```
Total size: 273x70 pixels

## Animation Configuration:

### Boss 1:
- **Frame width:** 68px
- **Frame height:** 69px
- **Total frames:** 8
- **Frames per row:** 4
- **Rows:** 2
- **Animation speed:** 150ms per frame

### Boss 2:
- **Frame width:** 68px
- **Frame height:** 67px
- **Total frames:** 8
- **Frames per row:** 4
- **Rows:** 2
- **Animation speed:** 150ms per frame

### Boss 3:
- **Frame width:** 68px
- **Frame height:** 70px
- **Total frames:** 4
- **Frames per row:** 4
- **Rows:** 1
- **Animation speed:** 150ms per frame

## Fallback Behavior:

If sprite files are missing, the game will display colored rectangles:
- Stage 1 (Marisa): Purple (#7e57c2)
- Stage 2 (Elly): Pink (#e91e63)
- Stage 3 (Alice): Gold (#ffd700)

## Creating Your Own Sprites:

### For Boss 1 (8 frames):
1. Use any pixel art or digital art software
2. Create 8 frames showing smooth movement (floating, breathing, etc.)
3. Arrange frames in 2 rows x 4 columns in a single PNG file
4. Make sure each frame is exactly 68x69 pixels
5. Use transparent background (PNG with alpha channel)
6. Total canvas size: 273x138 pixels
7. Save as boss1.png

### For Boss 2 (8 frames):
1. Use any pixel art or digital art software
2. Create 8 frames showing smooth movement with magic effects
3. Arrange frames in 2 rows x 4 columns in a single PNG file
4. Make sure each frame is exactly 68x67 pixels
5. Use transparent background (PNG with alpha channel)
6. Total canvas size: 271x135 pixels
7. Save as boss2.png

### For Boss 3 (4 frames):
1. Use any pixel art or digital art software
2. Create 4 frames showing elegant movement (floating, glowing, etc.)
3. Arrange frames horizontally in a single PNG file
4. Make sure each frame is exactly 68x70 pixels
5. Use transparent background (PNG with alpha channel)
6. Total canvas size: 273x70 pixels
7. Save as boss3.png

## Example Tools:
- Aseprite (pixel art)
- GIMP (free image editor)
- Photoshop
- Krita (free digital painting)

## Tips:
- Keep the character centered in each frame
- Use subtle movements for smooth animation
- Consider the game's color scheme (dark background)
- Add glow effects for a magical look
