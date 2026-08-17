# Verification — Pascal Furniture Popup v2

验证日期：2026-08-17

## 已通过

1. `node scripts/check-project.mjs`
   - 双门户结构存在。
   - Pascal 家具弹窗入口存在。
   - 前 / 后 / 左 / 右移动存在。
   - 左转 / 右转旋转存在。
   - 旧的 `3D展示 · 家具傻瓜式移动` 页面标题不存在。
   - 数值型家具编辑器不存在。
   - 新 localStorage key 存在。
   - 卫生间淋浴仍位于既定左下角位置。

2. TypeScript 语法解析
   - 21 个 TS / TSX 文件通过 TypeScript transpile 语法检查。
   - 语法错误：0。

3. 家具操作逻辑自测
   - 主卧床右移一次：`x -4.15 -> -4.00`。
   - 高度坐标保持不变。
   - 主卧床旋转一次：`-90° -> -75°`。
   - 控制窗口默认 `controlOpen=false`。
   - 页面存在独立“调整家具”打开按钮。
   - 移动和旋转均调用同一自动保存逻辑。

4. 弹窗持续操作修复
   - Design ID / Scenario 切换时才关闭弹窗。
   - 单次家具自动保存只同步 Scene，不会关闭正在使用的家具控制窗口。

## 环境限制

当前执行容器无法从 npm registry 下载 `@pascal-app/*` 依赖：在线安装超时，offline cache 也不存在，因此本容器无法重新执行完整 `next build`。

这不是本次修改引发的构建错误；项目结构检查、TS/TSX 语法检查与家具移动/旋转数据逻辑均已实际通过。本项目继续沿用上一版相同的 Pascal / Next.js 依赖版本。
