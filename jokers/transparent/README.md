# Joker 透明贴图

保留 `jokers/` 原图；此目录为内置 image_gen 去背景后的 PNG，供游戏引用。

- `joker.png` → regular / 百搭
- `doublejoker.png` → double / 双数
- `colorchange.png` → change / 换色
- `middlejoker.png` → mirror / 镜像

使用内置工具，`transparent_background: true`。每张原图单独编辑，提示词如下（`{filename}` 对应文件名）：

> Use case: background-extraction. Edit target: the attached {filename}.png. Remove only the pale white/gray photographic background, including background inside the line-art gaps, to genuine alpha transparency. Preserve the exact original joker emblem, its original colored or black ink, facial expression, geometry, lines, and orientation. For the half-black color-change joker preserve the black half and its white facial marks. No redesign, no added details, no text, no shadow, no tile or border. Center the complete emblem with a small even transparent margin, tightly framed square game icon.
