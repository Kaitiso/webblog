# Touhou Mini Game - 3 Stage Boss Battle

## Tổng quan
Game Touhou mini với 3 màn boss, mỗi màn có:
- Boss riêng với sprite animation (4 frames)
- Nhạc nền riêng
- Máu tăng dần (1000 → 1500 → 2000 HP)
- Hiệu ứng chuyển màn

## Cấu trúc File

### Assets đã chuẩn bị:
```
static/
├── audio/
│   ├── stage1.mp3  # Nhạc màn 1 - Marisa
│   ├── stage2.mp3  # Nhạc màn 2 - Elly
│   └── stage3.mp3  # Nhạc màn 3 - Yuuka
└── images/game-sprites/
    ├── boss1.png   # Sprite Marisa (273x138px, 8 frames - 2 hàng x 4 cột)
    ├── boss2.png   # Sprite Elly (271x135px, 8 frames - 2 hàng x 4 cột)
    └── boss3.png   # Sprite Yuuka (273x70px, 4 frames - 1 hàng x 4 cột)
```

### Code Files:
- `themes/reimu/assets/js/touhou-game.ts` - Logic game chính
- `themes/reimu/assets/js/boss-patterns.ts` - Bullet patterns
- `themes/reimu/layouts/partials/touhou-game.html` - UI overlay
- `layouts/partials/touhou-game.html` - UI override

## Tính năng mới

### 1. Hệ thống 3 màn
- **Stage 1: Marisa** - Boss váy xanh, 1000 HP, 8 frames animation
- **Stage 2: Elly** - Boss váy đỏ, 1500 HP, 8 frames animation
- **Stage 3: Yuuka** - Boss váy tím, 2000 HP, 4 frames animation

### 2. Sprite Animation
- **Boss 1**: 8 frames animation (2 hàng x 4 frames, 68x69px mỗi frame)
- **Boss 2**: 8 frames animation (2 hàng x 4 frames, 68x67px mỗi frame)
- **Boss 3**: 4 frames animation (1 hàng x 4 frames, 68x70px mỗi frame)
- Animation tự động chạy với tốc độ 150ms/frame
- Fallback về màu sắc nếu không có sprite

### 3. Nhạc nền
- Mỗi màn có nhạc riêng (stage1.mp3, stage2.mp3, stage3.mp3)
- Nhạc tự động loop
- Volume: 50%
- Tự động chuyển nhạc khi chuyển màn

### 4. Boss liên tiếp
- Khi boss hết máu → boss mới xuất hiện ngay lập tức
- Nhạc nền tự động chuyển sang boss mới
- Thanh máu đầy trở lại
- Bullet patterns reset
- Không có màn hình chuyển cảnh

### 5. UI Updates
- Hiển thị số stage hiện tại
- Hiển thị tên boss trên canvas
- Thanh máu boss
- Hướng dẫn điều khiển đầy đủ

## Cách chơi

### Điều khiển:
- **Arrow Keys / WASD**: Di chuyển
- **Z**: Bắn (giữ để bắn liên tục)
- **Shift**: Di chuyển chậm (để né đạn chính xác)
- **ESC**: Đóng game
- **Pause button**: Tạm dừng

### Gameplay:
1. Bắt đầu với 5 mạng
2. Đánh bại Boss 1 (Marisa) → Boss 2 (Elly) xuất hiện ngay (+1 mạng)
3. Đánh bại Boss 2 (Elly) → Boss 3 (Yuuka) xuất hiện ngay (+1 mạng)
4. Đánh bại Boss 3 (Yuuka) → Chiến thắng (+1 mạng)
5. Mất hết mạng = Game Over

**Lưu ý**: 3 boss xuất hiện liên tiếp trong cùng 1 màn, không có màn hình chuyển cảnh

### Cơ chế đặc biệt:
- **Bomb Effect**: Khi dính đạn, tất cả đạn boss sẽ bị xóa
- **Invulnerability**: 2 giây bất tử sau khi bị hit
- **Bonus Life**: Đánh bại boss → +1 mạng
- **Increased Damage**: Đạn người chơi gây 2 damage (tăng từ 1)

### Điểm số:
- Mỗi hit vào boss: +2 damage
- Đánh bại boss: +1000 điểm + 1 mạng

## Kỹ thuật Implementation

### Boss Sprite Animation
```typescript
// Boss 1 (8 frames - 273x138px)
interface Boss {
  sprite: HTMLImageElement | null;
  spriteWidth: 273;      // Tổng width của sprite sheet
  spriteHeight: 138;     // Tổng height (2 hàng)
  frameWidth: 68;        // Width mỗi frame
  frameHeight: 69;       // Height mỗi frame
  currentFrame: 0-7;     // Frame hiện tại
  animationSpeed: 150;   // ms per frame
  totalFrames: 8;        // Tổng số frames
  framesPerRow: 4;       // Số frames trên 1 hàng
}

// Boss 2 (8 frames - 271x135px)
interface Boss {
  sprite: HTMLImageElement | null;
  spriteWidth: 271;      // Tổng width của sprite sheet
  spriteHeight: 135;     // Tổng height (2 hàng)
  frameWidth: 68;        // Width mỗi frame
  frameHeight: 67;       // Height mỗi frame
  currentFrame: 0-7;     // Frame hiện tại
  animationSpeed: 150;   // ms per frame
  totalFrames: 8;        // Tổng số frames
  framesPerRow: 4;       // Số frames trên 1 hàng
}

// Boss 3 (4 frames - 273x70px)
interface Boss {
  sprite: HTMLImageElement | null;
  spriteWidth: 273;      // Tổng width của sprite sheet
  spriteHeight: 70;      // Tổng height (1 hàng)
  frameWidth: 68;        // Width mỗi frame
  frameHeight: 70;       // Height mỗi frame
  currentFrame: 0-3;     // Frame hiện tại
  animationSpeed: 150;   // ms per frame
  totalFrames: 4;        // Tổng số frames
  framesPerRow: 4;       // Số frames trên 1 hàng
}
```

### Stage Management
```typescript
interface GameState {
  stage: 1-3;           // Màn hiện tại
  maxStage: 3;          // Tổng số màn
}
```

### Music System
```typescript
private bgMusic: HTMLAudioElement | null;

playStageMusic(stage: number) {
  // Dừng nhạc cũ
  // Load nhạc mới từ /audio/stage{stage}.mp3
  // Set loop = true, volume = 0.5
  // Play
}
```

### Boss Succession
```typescript
// Khi boss chết:
1. gameState.stage++
2. Spawn boss mới ngay lập tức
3. Play nhạc mới
4. Boss mới có máu đầy
5. Không có delay hay transition
```

## Sprite Sheet Format

### Boss 1 (8 frames - 2 hàng):
```
Hàng 1: [Frame 0][Frame 1][Frame 2][Frame 3]
Hàng 2: [Frame 4][Frame 5][Frame 6][Frame 7]
         68px     68px     68px     68px
```
Total: 273x138 pixels, PNG với alpha channel

### Boss 2 (8 frames - 2 hàng):
```
Hàng 1: [Frame 0][Frame 1][Frame 2][Frame 3]
Hàng 2: [Frame 4][Frame 5][Frame 6][Frame 7]
         68px     68px     68px     68px
```
Total: 271x135 pixels, PNG với alpha channel

### Boss 3 (4 frames - 1 hàng):
```
[Frame 0][Frame 1][Frame 2][Frame 3]
  68px     68px     68px     68px
```
Total: 273x70 pixels, PNG với alpha channel

## Audio Format

- Format: MP3 (tương thích tốt nhất với browser)
- Bitrate: 128-192 kbps
- Kích thước: < 5MB mỗi file
- Loop: Tự động

## Testing

Để test game:
1. Click vào nút RSS trên website
2. Game sẽ mở với màn 1
3. Đánh boss để test chuyển màn
4. Kiểm tra sprite animation
5. Kiểm tra nhạc nền

## Troubleshooting

### Không có sprite:
- Kiểm tra file boss1.png, boss2.png, boss3.png trong `/static/images/game-sprites/`
- Game sẽ fallback về hình chữ nhật màu

### Không có nhạc:
- Kiểm tra file stage1.mp3, stage2.mp3, stage3.mp3 trong `/static/audio/`
- Kiểm tra console log để xem lỗi
- Game vẫn chạy bình thường không có nhạc

### Build TypeScript:
```bash
cd themes/reimu
npm install
npm run build
```

## Credits

- Game engine: Custom TypeScript/Canvas
- Bullet patterns: boss-patterns.ts
- Sprites: Chuẩn bị bởi user
- Music: Chuẩn bị bởi user
