# DLCServer · 《长夜安魂曲》内容包馆

独立进程，默认 **`:4174`**（游戏预览仍用 `:4173`，互不抢口）。

职责：发布 **catalog.json** + **内容包**（`content.json` / `.tgz`），供游戏 DLC 商店拉册、入门远程包。  
馆首页只读浏览；**写口**为令牌认证的 `POST /api/upload`（给作者 / agent），无对路人开放的浏览器投卷表单。详见 [UPLOAD.md](./UPLOAD.md)。

## 快速启动

```bash
cd dlc-server
npm run regen          # 扫描 packages/ → catalog.json
npm run seed-zips      # 同上并打 dist-packages/*.tgz
DLC_UPLOAD_TOKEN=secret npm start   # 0.0.0.0:4174；不设 TOKEN 则上传 503
```

馆首页（藏经阁 UI）：`http://<host>:4174/`  
设计台（积木拼卷）：`http://<host>:4174/designer`  
健康检查：`http://<host>:4174/health`（含 `upload: true|false`）  
目录 API：`http://<host>:4174/catalog.json`  
入藏 API：`POST /api/upload`（需 Bearer / X-DLC-Token）

浏览页：按门派 / 内容卷 / **内容标签**翻册、展卷详情、取 `.tgz`；页脚注明「作者须持令牌经接口入藏」。  
设计台：浏览器白名单积木拼装 `pack.json` + `content.json`（含 B 档字段与 **关卡导演** `stages` 浪次/Boss），默认下载/复制；可选 Bearer 上传。见 `/designer`、`/assets/designer-schema.json`。

## 磁盘布局

```
dlc-server/
  public/          # 藏经阁静态页（/ → index.html；/designer → 设计台）
  packages/<id>/
    pack.json      # id, name, kind(menpai|pack), version, description, tags?, builtin?
    content.json   # 纯数据：talismans / pills / skills / …（无任意 JS）
  dist-packages/   # npm run seed-zips 生成的 .tgz
  catalog.json     # regen 产物（含各条 tags）
  server.mjs
  UPLOAD.md        # agent 入藏配方
```

### pack.json 示例

```json
{
  "id": "hanmang",
  "kind": "pack",
  "name": "寒芒",
  "version": "1.0.0",
  "description": "纸上凝霜，一枚寒芒符：身前寒刃锥击。",
  "tags": ["talisman"],
  "builtin": false
}
```

### 建议标签词汇（文档约定，未知不硬拒）

`talisman` · `pill` · `skill` · `neigong` · `weapon` · `material` · `armor` · `enemy` · `stage` · `affix` · `menpai-bundle`

门派类型仍看 `kind`；`menpai-bundle` 可用于「一门派多内容」类卷。`scripts/regen-catalog.mjs` 会把 `tags` 抄进 catalog（缺省 `[]`）。

### content.json

与游戏 Cordis 目录字段对齐的 JSON（符效脚本、灵符、丹、外功等）。  
Schema 仍由游戏核心校验；非法条目会被拒并打日志。  
**远程无 Config**：馆种子伤害/段数须写成 Cordis 默认值的固化展开（参见 `packages/chixia`、`packages/qiangying`）。

投放后：

```bash
npm run regen
# 若要提供可下载卷轴：
npm run seed-zips
# 若 server 已在跑，catalog 下次请求即读新文件（无需重启）
# 经 POST /api/upload 入藏时服务端会自动 regen --zip
```

## 游戏如何发现

客户端默认请求：`同主机:4174/catalog.json`。

| 方式 | 说明 |
| --- | --- |
| 默认 | `http://<当前hostname>:4174` |
| 查询串 | `?dlc=http://192.168.31.168:4174` |
| 关闭远程 | `?dlc=off`（只用内置 OPTIONAL_*） |
| 构建期 | `VITE_DLC_BASE=http://100.119.85.62:4174` |

商店打不开馆时**自动退回**内置门派/内容包列表，离线仍可玩。

「入门」：优先加载游戏内置 Cordis 包；若仅馆上有，则拉 `content.json` 注入目录。

## AIHome 端口与 URL

| 服务 | 端口 | 局域网 | Tailscale |
| --- | --- | --- | --- |
| 游戏 preview | 4173 | http://192.168.31.168:4173/ | http://100.119.85.62:4173/ |
| DLCServer | 4174 | http://192.168.31.168:4174/ （UI）· /catalog.json | http://100.119.85.62:4174/ （UI）· /catalog.json |

建议目录：`/home/xi/Media/requiem-dlc-server`（与 `requiem-web` 并列）。

## 环境变量

- `DLC_PORT` / `PORT` — 默认 `4174`
- `DLC_HOST` — 默认 `0.0.0.0`
- `DLC_UPLOAD_TOKEN` — 上传 / 删除令牌；**未设则写接口 503**
