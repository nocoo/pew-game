<p align="center">
  <img src="assets/brand/icon-rounded.png" alt="Pew Game" width="128" height="128" />
</p>

<h1 align="center">Pew.md</h1>

<p align="center">用键盘躲避敌人、收集道具，在浏览器里挑战一波又一波的像素射击。</p>

<p align="center">
  <a href="https://pew.md">站点</a> ·
  <a href="docs/README.en.md">English</a>
</p>

## 这是什么

Pew Game（pew.md）是一款单人浏览器射击游戏，玩法灵感来自《星露谷物语》的 Journey of the Prairie King。玩家控制牛仔在方形场地中移动并自动射击，躲避不断出现的敌人，结束后可以提交分数到排行榜。

游戏使用键盘操作，适合桌面浏览器。角色、场景和道具像素图由代码绘制，游戏循环独立于 React；页面与排行榜由 Next.js 提供。

![Pew.md 游戏画面](https://s.zhe.to/dcd0e6e42358/20260222/8f74eaa9-20c4-4d15-990f-52d2349fb950.jpg)

## 功能

- 从 3 条生命开始，受伤后获得短暂无敌时间；敌人数量和生成速度随波次增加。
- 普通、快速和坦克三类敌人，随着波次逐步出现。
- 持续向最后移动方向自动射击，移动时射速略有提高。
- 收集散射、快速射击、穿透和清场道具；前三种效果会在一段时间后结束。
- 使用 1–6 位英文字母或数字名字提交成绩，查看历史前 10 名排行榜。
- 以 320 × 320 的逻辑画布绘制，在页面中按 2 倍像素放大显示。

## 使用

打开 [pew.md](https://pew.md)，按以下方式游玩：

| 操作 | 按键 / 行为 |
| --- | --- |
| 开始 | Space 或 Enter |
| 移动和改变射击方向 | WASD 或方向键 |
| 射击 | 自动持续射击；停止移动后保留最后方向 |
| 提交分数 | 游戏结束后输入名字并点击 Save，也可以 Skip |
| 再来一局 | 关闭成绩表单后按 Space 或 Enter |

第 3 波起，击败敌人有机会掉落道具；清场道具从第 5 波起出现。

| 道具 | 效果 |
| --- | --- |
| Spread | 扇形发射 3 发子弹 |
| Rapidfire | 射速翻倍 |
| Pierce | 子弹穿过敌人 |
| Nuke | 清除当前场上敌人 |

排行榜需要连接服务器。成绩由客户端上报，服务端检查会话签名、重复提交，以及分数、波次和时长的合理性；它不回放完整对局。

## 开发

需要 Bun 和 Node.js 22.12+。`better-sqlite3` 使用原生模块；依赖安装需要完成该模块的构建或预编译二进制安装。

```bash
git clone https://github.com/nocoo/pew-game.git
cd pew-game
bun install --frozen-lockfile
bun run dev
```

开发服务默认位于 `http://localhost:3000`。SQLite 数据库会在首次访问时自动创建，默认路径为仓库根目录的 `pew.db`。

| 环境变量 | 用途 |
| --- | --- |
| `DATABASE_PATH` | SQLite 文件路径；父目录需要存在，部署时使用持久化存储 |
| `ANTICHEAT_SECRET` | 会话 token 的 HMAC 签名密钥；部署时设置独立随机值 |

```bash
bun run check       # ESLint 与测试
bun run typecheck
bun run build
bun run start
```

仓库提供 [Dockerfile](Dockerfile)，容器使用 `/app/data/pew.db`；部署时为 `/app/data` 挂载持久卷并设置 `ANTICHEAT_SECRET`。当前重复提交记录保存在服务进程内存中。服务提供公开健康检查接口 `GET /api/live`，带有 `Cache-Control: no-store`，数据库正常时返回 HTTP 200，故障时返回 HTTP 503。

```text
src/game/          输入、游戏循环、像素绘图与战斗规则
src/components/    Canvas 容器、成绩表单与排行榜
src/lib/           SQLite 和成绩校验
src/app/api/       会话 token、成绩 API 与健康检查 (/api/live)
src/__tests__/     单元与游戏循环测试
e2e/bdd/           浏览器页面冒烟测试
```

## 测试

从仓库根目录执行：

| 测试层 | 命令 |
| --- | --- |
| 单元与游戏循环测试 | `bun run test` |
| 仅游戏循环集成测试 | `bun run test:e2e` |
| 浏览器冒烟测试 | `bun run test:e2e:bdd` |

浏览器测试前执行 `bunx playwright install chromium`；Playwright 自动启动端口 `23000` 的本地服务，检查页面标题和主标题。游戏循环测试在无 Canvas 的模拟帧中检查规则，实际画面、键盘手感和成绩提交仍需打开游戏验证。`bun run test:coverage` 可生成覆盖率报告。

## 技术栈

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Canvas](https://img.shields.io/badge/Canvas_2D-555555)
![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)

| 部分 | 实现 |
| --- | --- |
| 游戏 | TypeScript、Canvas 2D、OffscreenCanvas、requestAnimationFrame |
| Web 页面与 API | Next.js App Router、React、Tailwind CSS |
| 排行榜 | SQLite、better-sqlite3、Node.js HMAC |
| 开发与测试 | Bun、ESLint、Vitest、Playwright |

## 文档

- [Logo 使用指南](docs/01-logo-usage.md)
- [项目视觉档案](https://hexly.ai/logos/pew-game)
- [游戏类型与场地定义](src/game/types.ts)

## 许可证

[MIT](LICENSE) © 2026 Zheng Li
