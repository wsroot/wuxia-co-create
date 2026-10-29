# DLCServer 部署到 AIHome（交主机 Bot）

**不要**与游戏抢 `:4173`。DLCServer 用 **`:4174`**。

## 产物

本仓库打好的部署包（见上级或 `/workspace`）：

- `requiem-dlc-server.tgz` — 含 server、packages、catalog、dist-packages、README（无 node_modules）

## 步骤（在 AIHome 上）

```bash
# 1) 解压
mkdir -p /home/xi/Media/requiem-dlc-server
cd /home/xi/Media
# 将 tgz 放到此处后：
tar xzf requiem-dlc-server.tgz -C requiem-dlc-server --strip-components=1
# 若包内顶层已是 dlc-server/ 文件，则：
# tar xzf requiem-dlc-server.tgz -C /home/xi/Media && mv dlc-server requiem-dlc-server

cd /home/xi/Media/requiem-dlc-server

# 2) 确认目录
node -e "JSON.parse(require('fs').readFileSync('catalog.json','utf8')); console.log('catalog ok')"

# 3) 停旧进程（若有）
pkill -f 'requiem-dlc-server/server.mjs' || true
pkill -f 'dlc-server/server.mjs' || true

# 4) 启动（后台）— 设入藏令牌后方可 POST /api/upload
export DLC_UPLOAD_TOKEN='替换为强随机串'   # 勿提交进 git；与 agent 共享
nohup env DLC_UPLOAD_TOKEN="$DLC_UPLOAD_TOKEN" node server.mjs > /tmp/requiem-dlc-server.log 2>&1 &
echo $! > /tmp/requiem-dlc-server.pid
sleep 1
curl -sS http://127.0.0.1:4174/health
curl -sS http://127.0.0.1:4174/catalog.json | head -c 200

# 5) 外网/局域网抽检
# curl -sS http://192.168.31.168:4174/health
# curl -sS http://100.119.85.62:4174/health
```

游戏侧若已部署含 DLC 拉册的客户端：打开标题 → DLC 商店，应见「册上物什已从藏经阁对齐」。  
可强制指定：`http://192.168.31.168:4173/?dlc=http://192.168.31.168:4174`

## 发布新包

### A) 令牌 API（推荐给 agent）

```bash
# 见 UPLOAD.md；需已 export DLC_UPLOAD_TOKEN 并启动 server
curl -sS -X POST http://127.0.0.1:4174/api/upload \
  -H "Authorization: Bearer $DLC_UPLOAD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pack":{"id":"my-pack","kind":"pack","name":"试篇","version":"1.0.0","description":"…","tags":["talisman"]},"content":{"talismans":{}}}'
# 服务端自动 regen --zip；无需重启
```

### B) 手工投放

```bash
# 在 AIHome
cd /home/xi/Media/requiem-dlc-server
mkdir -p packages/my-pack
# 写入 pack.json + content.json（可含 tags?: string[]）
node scripts/regen-catalog.mjs --zip
# catalog 热更新；无需重启 server
```

## 回滚

```bash
kill $(cat /tmp/requiem-dlc-server.pid) 2>/dev/null || pkill -f 'requiem-dlc-server/server.mjs'
```
