# 覆盖现有 Dreamhouse 仓库并部署

## 方法 1：直接覆盖当前仓库

把本压缩包解压后，把里面的所有文件复制到你当前 `Dreamhouse` 仓库根目录。
旧的 `public/index.html` 可以删除；新系统不再依赖它。

然后执行：

```bash
git add -A
git commit -m "replace static demo with Pascal-native Dreamhouse"
git push origin main
```

进入 GitHub 仓库：

`Settings → Pages → Build and deployment → Source`

选择：

`GitHub Actions`

之后 `.github/workflows/deploy-pages.yml` 会自动安装依赖、构建 Next.js 静态站点并发布 `out/`。

## 方法 2：先本地验证

```bash
npm install --no-audit --no-fund
npm run typecheck
npm run dev
```

访问：

`http://localhost:3000`

确认 Pascal Editor、门窗、家具和生命周期修改正常后再 push。

## 注意

GitHub Pages 是纯静态部署，所以：

- 当前生命周期 Planner 在浏览器端运行；
- 场景和版本存 localStorage；
- 不要把大模型 API Key 写进前端；
- 真正接打印机/ROS2/仿真服务时，建议再增加独立后端网关。
