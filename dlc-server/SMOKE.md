# DLCServer 本地冒烟（2026-10-27）

## 服务

```bash
cd dlc-server && npm run regen -- --zip  # or: node scripts/regen-catalog.mjs --zip
DLC_UPLOAD_TOKEN=test-token node server.mjs   # :4174
```

## 检查

| URL | 期望 |
| --- | --- |
| GET / | 200，`text/html`，含「藏经阁」；页脚「作者须持令牌」 |
| GET /health | `{"ok":true,"service":"DLCServer","port":4174,"upload":true}` |
| GET /catalog.json | schemaVersion 1；各条含 `tags`（如 hanmang→`["talisman"]`） |
| GET /assets/style.css · /assets/app.js | 200；UI 有标签 chips |
| GET /packages/hanmang/content.json | 200，含 talismanScripts + talismans |
| GET /dist-packages/hanmang.tgz | 200，gzip |
| GET /UPLOAD.md | 200，入藏配方 |

## 上传烟测

```bash
TOKEN=test-token
BASE=http://127.0.0.1:4174

# 成功 JSON
curl -sS -X POST "$BASE/api/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pack":{"id":"smoke-tag-demo","kind":"pack","name":"烟测签","version":"0.0.1","description":"可删","tags":["talisman"],"builtin":false},"content":{"talismans":{}}}'
# → ok:true，catalog 可见 smoke-tag-demo

# 坏令牌 → 401
curl -sS -o /tmp/u401.json -w "%{http_code}" -X POST "$BASE/api/upload" \
  -H "Authorization: Bearer wrong" -H "Content-Type: application/json" \
  -d '{"pack":{"id":"x","kind":"pack","name":"x","version":"0"},"content":{}}'
# → 401

# 无令牌 → 401
curl -sS -o /tmp/u-none.json -w "%{http_code}" -X POST "$BASE/api/upload" \
  -H "Content-Type: application/json" -d '{}'

# 清理烟测卷
curl -sS -X DELETE "$BASE/api/packs/smoke-tag-demo" -H "Authorization: Bearer $TOKEN"
```

未设 `DLC_UPLOAD_TOKEN` 启动时，同上 POST → **503**。

## 游戏

1. 另开 `npm run preview`（:4173）
2. 打开 `http://127.0.0.1:4173/` → DLC 商店 → 应提示藏经阁对齐；可见「隐风」卷 1.0.0
3. `?dlc=off` → 无「隐风」，仅内置
4. `?dlc=http://127.0.0.1:4174` → 强制馆址

## 包 md5（regen --zip 后）

见 `catalog.json` 各条 `md5`；部署包：

- `requiem-dlc-server.tgz` — DLCServer 全量
- `requiem-web-dlc-assets.tgz` — 游戏 assets-only（含拉册客户端）
