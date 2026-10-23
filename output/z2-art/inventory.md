# Z2-ART inventory

Coordinates: top-left pixel origin. Raw bbox A>0; visible bbox A>=128. Base = midpoint of occupied x range in bottom 8 visible-alpha rows, y = last visible-alpha row. Canvas bottom-centre remains the engine anchor. This alpha metric includes baked shadow and does not identify semantic foundations. Raw A>0 on sala has a stray corner pixel (base x=0); the visible threshold avoids using that artifact as the foundation.

| Key | Existing reference | Size | Raw bbox | Visible bbox | Visible base | Zone 1 pair | New file |
|---|---|---|---|---|---|---|---|
| judgment | img/theme-v4/town-judgment-asia-v2.webp | [1536, 1024] | [21, 11, 1491, 1007] | [21, 12, 1491, 1007] | [755.0, 1006] | img/theme-v4/town-judgment-th-v2.webp | img/theme-v4/town-judgment-asia-v3.webp |
| house-front-one | img/town-district/house-front-one-asia-v1.webp | [1402, 1122] | [0, 17, 1399, 1122] | [0, 17, 1399, 1122] | [698.5, 1121] | img/town-district/house-front-one-v1.webp | img/town-district/house-front-one-asia-v3.webp |
| house-right-one | img/town-district/house-right-one-asia-v1.webp | [1438, 1094] | [0, 0, 1438, 1078] | [0, 0, 1438, 1078] | [421.0, 1077] | img/town-district/house-right-one-v1.webp | img/town-district/house-right-one-asia-v3.webp |
| house-left-two | img/town-district/house-left-two-asia-v1.webp | [1036, 1518] | [0, 0, 1036, 1518] | [0, 0, 1036, 1518] | [783.5, 1517] | img/town-district/house-left-two-v1.webp | img/town-district/house-left-two-asia-v3.webp |
| house-right-two | img/town-district/house-right-two-asia-v1.webp | [1036, 1518] | [0, 0, 1036, 1500] | [0, 0, 1036, 1500] | [375.0, 1499] | img/town-district/house-right-two-v1.webp | img/town-district/house-right-two-asia-v3.webp |
| lamp | img/theme-v4/town-lamp-asia-v1.webp | [512, 1112] | [5, 5, 506, 1107] | [5, 5, 506, 1107] | [256.0, 1106] | img/theme-v4/town-lamp-gold-th-v1.webp | img/theme-v4/town-lamp-asia-v3.webp |
| torch | img/map-zone2/torch-pillar-v1.webp | [240, 419] | [47, 0, 212, 419] | [47, 3, 212, 419] | [129.5, 418] | img/map-zone1/torch-pillar-v1.webp | img/map-zone2/torch-pillar-v3.webp |
| sala | img/map-v5/st-sala-asia.webp | [1254, 1254] | [0, 0, 1254, 1254] | [12, 7, 1250, 1212] | [820.5, 1211] | img/map-v5/st-sala-th-v2.webp | img/map-v5/st-sala-asia-v3.webp |
| tea | img/theme-v4/st-tea-asia.webp | [365, 375] | [8, 8, 357, 367] | [9, 9, 356, 366] | [196.0, 365] | img/map-v5/st-tea-th-v2.webp | img/theme-v4/st-tea-asia-v3.webp |
| sawan | img/map-v5/st-sawan-asia.webp | [1240, 1249] | [0, 0, 1240, 1249] | [16, 4, 1238, 1241] | [626.5, 1240] | img/map-v5/st-sawan-th-v2.webp | img/map-v5/st-sawan-asia-v3.webp |
| krajok | img/map-v5/st-krajok-asia.webp | [1187, 1216] | [0, 0, 1187, 1216] | [3, 3, 1184, 1213] | [650.5, 1212] | img/map-v5/st-krajok-th-v2.webp | img/map-v5/st-krajok-asia-v3.webp |
| sakura | img/theme-v4/town-tree-asia-v1.webp | [1199, 1312] | [1, 6, 1188, 1286] | [1, 6, 1188, 1286] | [591.5, 1285] | img/theme-v4/town-tree-th-v1.webp | img/theme-v4/town-tree-sakura-asia-v1.webp |
| willow | img/theme-v4/town-tree-asia-v1.webp | [1199, 1312] | [1, 6, 1188, 1286] | [1, 6, 1188, 1286] | [591.5, 1285] | img/theme-v4/town-tree-th-v1.webp | img/theme-v4/town-tree-willow-asia-v1.webp |

## Retained after inspection

- `town-tree-b-asia-v1.webp`: clearly red maple leaves; retained as allowed by brief.
- `town-tree-asia-v1.webp`: existing green tree retained; dimension/base reference for both new species.
- `town-tree-c-asia-v1.webp`: bamboo retained.
- `town-landmark-asia-v1.webp`: golden ginkgo retained.
- Rock excluded by brief.
- Sakura = white/pale pink and willow = turquoise waterside tree are Claudy interpretations awaiting owner confirmation.
- FACADE_SIZES are display limits, not native image dimensions. No source/code registration is changed.
