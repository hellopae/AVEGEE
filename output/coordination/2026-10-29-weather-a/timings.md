# Native CPU timing diagnostics

These are 4 paired samples of **CPU time per call to the real scene renderer**, in milliseconds. Effect OFF/ON in the current renderer. They are not browser frame times, do not use LOAD-01b, and do not establish the ~2 ms mobile limit. Native rasterization here takes hundreds of milliseconds; the backend differs substantially from Chrome/GPU.

| Zone | View | OFF median ms | ON median ms | Delta ms | OFF p95 | ON p95 | LOAD-01b mobile <= ~2 ms |
|---|---|---:|---:|---:|---:|---:|---|
| th | desktop | 1211.32 | 1206.82 | -4.51 | 1218.84 | 1207.87 | Unverified |
| th | 390 | 1196.47 | 1208.44 | +11.97 | 1208.26 | 1211.93 | Unverified |
| asia | desktop | 869.76 | 876.92 | +7.16 | 877.21 | 880.94 | Unverified |
| asia | 390 | 852.03 | 852.38 | +0.35 | 866.70 | 853.31 | Unverified |
| west | desktop | 1093.20 | 1095.38 | +2.18 | 1122.67 | 1143.76 | Unverified |
| west | 390 | 1084.32 | 1110.46 | +26.15 | 1110.27 | 1111.57 | Unverified |
| cyberhell | desktop | 341.75 | 333.35 | -8.39 | 345.94 | 355.80 | Unverified |
| cyberhell | 390 | 287.88 | 287.62 | -0.26 | 309.35 | 297.21 | Unverified |

Exact new-weather pixel checks (600×400; colored actor rectangle and background):

| Zone | Still across time under reduced motion | Moving actor pixels | Moving ground pixels | Changed label pixels |
|---|---|---:|---:|---:|
| th | True | 3055 | 105439 | 0 |
| asia | True | 3710 | 88678 | 0 |
| west | True | 3880 | 82673 | 0 |
| cyberhell | True | 3265 | 114637 | 0 |

Whole-scene reduced-motion hashes differ in all 8 town captures because unrelated legacy animations use separate clocks; only the isolated new weather is proven still. No missing lazy assets were reported in the local fixture. Browser/HUD/device acceptance remains open.
