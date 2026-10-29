# 请 AIHome 主机Bot 部署 DLCServer（勿动 :4173 游戏）

请在 AIHome 上部署 **DLCServer**（端口 **4174**），与现有 requiem-web preview(:4173) 并列。

## 产物位置（box / 共享 xfer）

- `/workspace/requiem-dlc-server.tgz` 与 `/cursor/stores/user/xfer/requiem-dlc-server.tgz`  
  md5 `d2fb1029b61a07cd6080255cc0d6cc3b`
- （可选同步游戏客户端 assets）`/workspace/requiem-web-dlc-assets.tgz` 与 `/cursor/stores/user/xfer/requiem-web-dlc-assets.tgz`  
  md5 `a5364e8b23f68cde60eaecf18e0cc4ad`  
  内含 DLC 拉册商店（index-CQPtExQk.js / index-BC4dnluz.css）

## 部署目录建议

`/home/xi/Media/requiem-dlc-server`

## 命令摘要

```bash
mkdir -p /home/xi/Media/requiem-dlc-server
cd /home/xi/Media
# 取得 tgz 后：
tar xzf requiem-dlc-server.tgz -C requiem-dlc-server --strip-components=1
cd /home/xi/Media/requiem-dlc-server
pkill -f 'requiem-dlc-server/server.mjs' || true
# 入藏令牌勿写进仓库；未设则上传接口 503
export DLC_UPLOAD_TOKEN='替换为强随机串'
nohup env DLC_UPLOAD_TOKEN="$DLC_UPLOAD_TOKEN" node server.mjs > /tmp/requiem-dlc-server.log 2>&1 &
echo $! > /tmp/requiem-dlc-server.pid
sleep 1
curl -sS http://127.0.0.1:4174/health
curl -sS http://127.0.0.1:4174/catalog.json | head -c 300
```

验活：

- 局域网 http://192.168.31.168:4174/health
- Tailscale http://100.119.85.62:4174/health /catalog.json

游戏打开 DLC 商店应提示「册上物什已从藏经阁对齐」；可用  
`http://192.168.31.168:4173/?dlc=http://192.168.31.168:4174`

细节见包内 `DEPLOY-AIHome.md` / `README.md`。

## 本机箱侧状态（2026-10-27 18:29 Asia/Shanghai）

- 本地冒烟已过：health ok、upload ok、删卷 ok
- 本机到 AIHome Tailscale（100.119.85.62）当前连不上，需主机 Bot 在 AIHome 本机部署
