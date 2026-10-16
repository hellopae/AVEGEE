# AVEGEE — กติกา push กลาง (Claude + Codex)

เขียน 16 ต.ค. 2569 (ใบงาน `2026-10-16-git-push-flow`) เพื่อให้ Claude กับ Codex ส่งงานขึ้น GitHub ได้โดยไม่ทับกัน
ใช้คู่กับ `docs/ui-work-coordination-2026-10-15.md` (ใครถือไฟล์ไหน)

## ใครทำอะไรได้

| ผู้ทำงาน | push `main` | push branch | branch ที่ใช้ |
|---|---|---|---|
| Claude Dale (integrator ฝั่ง Claude) | **ได้** | ได้ | `dale/*` |
| Codex app (GUI ที่คุณเป้สั่งตรง) | **ได้** | ได้ | `main` หรือ `codex-app/*` |
| Claude Toby และ subagent อื่น | ไม่ได้ | ได้ | `toby/*` |
| Codex worker (`scripts/openai-worker.py --write`) | **ไม่ได้** | ได้ (wrapper push ให้) | `codex/<run_id>` |

`main` มีทางเข้าแค่ 2 ทาง: Dale หรือ Codex app. งานของคนอื่นเข้า `main` ผ่าน branch แล้วให้ Dale รีวิว + merge

## Codex worker ทำงานอย่างไร

- Codex รันใน sandbox `workspace-write` เขียนได้แค่ใน worktree ส่วน `.git` ของ repo หลักอยู่นอก sandbox — commit/สร้าง branch เองไม่ได้ (เป็นการออกแบบ ไม่ขยาย sandbox)
- **wrapper เป็นคน commit + push** หลัง Codex จบ (ทุกสถานะที่มีไฟล์เปลี่ยน): `git push -u origin codex/<run_id>` ไม่ force ไม่แตะ `main`
- ผลอยู่ใน `status.json` ของ run: `commit`, `pushed`, `push_error` — push ล้มเหลวไม่ทำให้ run ล้ม งานยังอยู่ใน worktree
- Codex ต้องทำงานใน working directory ที่ได้รับเท่านั้น ห้ามสร้าง worktree/clone/branch เอง (เคยไปสร้างใน `/private/tmp` แล้วงานหลุดจากที่ที่ Dale ตามเก็บ)

## ก่อน push `main` ทุกครั้ง

1. `git fetch origin`
2. `git rebase origin/main` (หรือ merge) — ชน: แก้ชนโดยรักษาของอีกฝั่ง ไม่ทับไฟล์ที่ฝั่งนั้นถือ แล้วเริ่มข้อ 1 ใหม่
3. `node --test tests/*.test.mjs` ต้อง 0 แดง
4. `git push origin HEAD:main` — **ห้าม `--force` / `--force-with-lease` ไป `main`** ถ้า push ถูกปฏิเสธเพราะมีคน push ก่อน ให้ fetch + rebase ซ้ำ ไม่บังคับ

## ชื่อ branch และข้อความ commit

- Claude: `toby/*`, `dale/*` · Codex worker: `codex/<run_id>` · Codex app: `codex-app/*` หรือ `main`
- ข้อความ commit **ขึ้นต้นด้วยรหัสงาน** (`K1d`, `M2`, `N3b` …) เช่น `M2: เพิ่มเอฟเฟกต์ cut-in` เพื่อไล่ย้อนได้ (commit ของ Codex worker ขึ้นต้นด้วย `Codex <run_id>:` อยู่แล้ว — ตอน merge เข้า `main` Dale ใส่รหัสงานเพิ่ม)

## ไฟล์ร่วมและ cache-bust

- ความเป็นเจ้าของไฟล์ตาม `docs/ui-work-coordination-2026-10-15.md`
- cache-bust (`?v=…`) ชนกัน → **รวม suffix ของทั้งสองฝั่ง** ไม่ตัดของอีกฝั่งทิ้ง; preload URL กับ import ใน `src/ui.js` ต้องตรงกัน; regex ใน `tests/*.test.mjs` ต้องรับได้ทุก suffix ที่มีอยู่

## หลัง merge

ลบ branch ที่ merge แล้วทั้ง local และ remote:

```sh
git push origin --delete <branch>
git branch -d <branch>          # ถ้าเป็น worktree: git worktree remove <path> ก่อน
```

Codex worker: `git worktree remove <worktree>` + `git branch -D codex/<run_id>` + `git push origin --delete codex/<run_id>`
