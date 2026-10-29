# C 档 P0：ColliderProfile — 完成记录

- **日期**：2026-10-28（Asia/Shanghai）
- **范围**：Schema + `ctx.colliders`；`assembleEnemyCollider`；旧 `body` 路径仍可跑
- **仓库路径**：`/workspace/requiem-web`
- **是否 bump 玩家存档**：**否**
- **未做**：不删 Skeleton；不改 gargoyle 旁路；不热更/不打部署包；Behavior/Silhouette 的必填 `body` 不动

入口：`src/plugins/schemas.ts`（ColliderSchema）· `src/plugins/services.ts`（ColliderService）· `src/entities/enemies/factory.ts`（assembleEnemyCollider）
