#!/bin/sh
# Z1-LAYOUT-A full rebuild. Needs: python3 with numpy, opencv-python, Pillow, pypdf (or PYTHONPATH=/private/tmp/avegee-pdf-lib), playwright for the last step.
# Source files are only read. Output: docs/art-reviews/2026-11-05-zone1-layout/
set -e
cd "$(dirname "$0")/.."
OUT=docs/art-reviews/2026-11-05-zone1-layout
rm -f $OUT/registration-correction.json
Z1_NO_CORRECTION=1 python3 scripts/extract-zone1-ok-layout.py      # 1. raw placement (Im7 normalisation only)
python3 scripts/check-zone1-objects.py --fit                       # 2. fit per-file residual vs ok.jpg
python3 scripts/extract-zone1-ok-layout.py                         # 3. final layout with the residual applied
python3 scripts/register-zone1-terrain.py                          # 4. terrain-seamless -> ok space
python3 scripts/build-zone1-layout-proof.py                        # 5. proof images, object-check.json, gaps
# 6. (optional) serve $OUT and run: python3 scripts/verify-zone1-layout-review.py <port>
