#!/usr/bin/env python3
"""Kept so old notes still work: same as  python3 scripts/install-ground.py <pack> --zone 1 ...  (see install-ground.py)."""
import runpy, sys
from pathlib import Path
sys.argv = [sys.argv[0], *sys.argv[1:], '--zone', '1']
runpy.run_path(str(Path(__file__).with_name('install-ground.py')), run_name='__main__')
