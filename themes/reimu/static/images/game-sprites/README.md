# Game Sprites Directory

Đặt sprite sheets của các nhân vật vào đây để game có thể load và hiển thị animation.

## Cấu trúc Sprite Sheet

### Reimu Sprite Sheet
- **File**: `reimu-sprite.png`
- **Kích thước frame**: 32x32 pixels
- **Số frames**: 4 frames (idle animation)
- **Layout**: Horizontal (4 frames nằm ngang)
- **Ví dụ**: `[Frame1][Frame2][Frame3][Frame4]`

### Fairy Sprite Sheet  
- **File**: `fairy-sprite.png`
- **Kích thước frame**: 32x32 pixels
- **Số frames**: 4 frames (flying animation)
- **Layout**: Horizontal (4 frames nằm ngang)
- **Ví dụ**: `[Frame1][Frame2][Frame3][Frame4]`

## Cách tạo Sprite Sheet

1. **Chuẩn bị ảnh**: Mỗi frame của animation nên có kích thước 32x32 pixels
2. **Sắp xếp**: Đặt các frames nằm ngang từ trái sang phải
3. **Lưu file**: Lưu với tên chính xác như trên
4. **Định dạng**: PNG với background trong suốt (transparent)

## Ví dụ Sprite Sheet Layout

```
Reimu Sprite Sheet (128x32):
┌─────┬─────┬─────┬─────┐
│Frame│Frame│Frame│Frame│
│  1  │  2  │  3  │  4  │
└─────┴─────┴─────┴─────┘

Fairy Sprite Sheet (128x32):
┌─────┬─────┬─────┬─────┐
│Frame│Frame│Frame│Frame│
│  1  │  2  │  3  │  4  │
└─────┴─────┴─────┴─────┘
```

## Lưu ý

- Nếu không có sprite sheet, game sẽ sử dụng fallback graphics (hình vuông màu)
- Animation speed có thể được điều chỉnh trong code
- Game sẽ tự động detect và load sprite sheets khi khởi động
