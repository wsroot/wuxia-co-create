# 藏经阁入藏 API（给 Agent）

令牌写口：`POST /api/upload`。浏览器馆页**无**自助投卷表单；作者须持令牌经接口入藏。  
可用馆内 **[设计台](/designer)** 白名单积木拼卷，导出 JSON 或（可选）填令牌上传；默认仍以下载/复制为主。

## 环境

| 变量 | 说明 |
| --- | --- |
| `DLC_UPLOAD_TOKEN` | **必填才开放写**。未设 → 上传返回 `503`，正文提示设此变量。 |
| `DLC_PORT` / `PORT` | 默认 `4174` |
| `DLC_HOST` | 默认 `0.0.0.0` |

鉴权（二选一）：

- `Authorization: Bearer <token>`
- `X-DLC-Token: <token>`

GET 仍公开（catalog / packages / UI）。

## 端点

### `POST /api/upload`

接受以下任一：

1. **`application/json`**（推荐给 agent）

```json
{
  "pack": {
    "id": "my-pack",
    "kind": "pack",
    "name": "试篇",
    "version": "1.0.0",
    "description": "跋语",
    "tags": ["talisman"],
    "builtin": false
  },
  "content": {
    "talismans": {}
  }
}
```

2. **`application/gzip` / `application/octet-stream`**：请求体为 `.tgz`（ustar + gzip），内仅 `pack.json` + `content.json`（可带一层目录前缀）。

3. **`multipart/form-data`**：字段名 `pack` = 上述 `.tgz` 文件。

校验：

- `pack.id` ∈ `^[a-z0-9][a-z0-9_-]{0,63}$`
- `kind` ∈ `menpai|pack`
- `content` 为对象
- 拒路径穿越；只写入 `packages/<id>/`
- `tags?: string[]` 可选；未知标签不硬拒（馆页据 catalog 并集展示）

成功后服务端写入 `packages/<id>/{pack.json,content.json}`，并跑 `node scripts/regen-catalog.mjs --zip`（**无需重启** server）。

**成功** `200`：

```json
{ "ok": true, "id": "my-pack", "md5": "<tgz md5>", "catalogEntry": { /* catalog 条目 */ } }
```

**失败**：`{ "ok": false, "error": "…" }`  
常见：`401` 令牌错/缺 · `503` 未设 `DLC_UPLOAD_TOKEN` · `400` 校验失败 · `413` 体过大。

### `DELETE /api/packs/:id`

同令牌。删 `packages/<id>/` 与 `dist-packages/<id>.tgz`，再 regen。

## curl 示例

```bash
TOKEN=your-secret
BASE=http://127.0.0.1:4174

# JSON 入藏
curl -sS -X POST "$BASE/api/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pack": {
      "id": "smoke-tag-demo",
      "kind": "pack",
      "name": "烟测签",
      "version": "0.0.1",
      "description": "入藏烟测，可删。",
      "tags": ["talisman"],
      "builtin": false
    },
    "content": { "talismans": {} }
  }'

# .tgz 入藏（先本地有 dist-packages/foo.tgz，或自打）
curl -sS -X POST "$BASE/api/upload" \
  -H "X-DLC-Token: $TOKEN" \
  -H "Content-Type: application/gzip" \
  --data-binary @dist-packages/hanmang.tgz

# multipart
curl -sS -X POST "$BASE/api/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "pack=@dist-packages/hanmang.tgz;type=application/gzip"

# 无令牌 → 401；服务未设 TOKEN → 503
curl -sS -X POST "$BASE/api/upload" -H "Content-Type: application/json" -d '{}'

# 删卷
curl -sS -X DELETE "$BASE/api/packs/smoke-tag-demo" \
  -H "Authorization: Bearer $TOKEN"
```

## 建议标签词汇（不硬拒未知）

`talisman` · `pill` · `skill` · `neigong` · `weapon` · `material` · `armor` · `enemy` · `stage` · `affix` · `menpai-bundle`  
门派仍用 `kind: "menpai"`；内容向可用 tags 补充。

## pack.json 字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | ✓ | 与文件夹名一致 |
| `kind` | ✓ | `menpai` \| `pack` |
| `name` | 建议 | 展示名 |
| `version` | 建议 | semver 字符串即可 |
| `description` | 建议 | 江湖跋语 |
| `tags` | 可选 | `string[]` |
| `builtin` | 可选 | 是否游戏内亦可载 |

手工投放仍可：写入 `packages/<id>/` 后 `node scripts/regen-catalog.mjs --zip`。
