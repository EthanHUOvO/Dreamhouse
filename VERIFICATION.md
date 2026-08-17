# Verification — Continuous Flow v4

验证日期：2026-08-17

## 已通过

执行：

```bash
npm run verify
```

结果：

```text
Dual portal structure: OK
Pascal design -> save -> submit -> downstream workflow: OK
TS/TSX syntax: PASS (23 files, 0 errors)
Furniture edit logic: PASS
Bed nudge: X -4.15 -> -4.00; Y locked at 0.00
Bed rotation: -90° -> -75°
Bathroom shower: X -1.15, Z 3.78
Continuous design workflow: PASS
Approved V2 -> Draft V3 -> Submitted -> Accepted -> Production
BOM regenerated from approved Scene: walls=10, furniture=22
```

完整业务链路测试实际执行：

1. 从施工中的 Design V2 创建 Design V3 Draft；
2. 应用“空间重新规划方案”；
3. 调整主卧床位置并写回 Draft Scene；
4. 提交 Change Request；
5. 验证提交时 Approved 仍保持 V2，没有覆盖当前施工依据；
6. 施工方接受 V3；
7. V3 升级为 Approved；
8. 订单返回 production；
9. 从 V3 Pascal Scene 重新统计墙体与家具并生成 BOM；
10. 生产 / 施工进度按新设计版本重新建立。

## 构建说明

本执行环境中 `npm install --no-audit --no-fund` 在 120 秒后网络超时，未能从 npm registry 下载 Pascal / Next 依赖，因此无法在此容器声称完成新的 `next build`。

GitHub Actions 已配置为：

```text
npm install
→ npm run verify
→ npm run build
→ 成功后才部署 Pages
```

因此仓库部署时，如果依赖安装或 Next/Pascal 构建存在真实编译问题，部署任务会停止，不会把失败构建发布到 Pages。


## v5 iterative redesign checks

Run `npm run test:iterative` to verify the resident construction page exposes:

- new redesign → create Draft and return to Design;
- continue an existing Draft;
- withdraw a submitted but unaccepted Change Request and continue editing.

The existing Approved version remains unchanged until the contractor accepts the newly submitted version.


## v5 actual verification result

Executed successfully in the provided environment:

```text
Dual portal structure: PASS
TS/TSX syntax: PASS (23 files, 0 errors)
Furniture nudge / rotation / drag clamp: PASS
Continuous Design -> Submit -> Accept -> BOM workflow: PASS
Iterative redesign: PASS
Approved V2 -> Draft V3 -> Submit -> Withdraw -> Resubmit -> Accept -> Draft V4
```

A fresh `npm install` was also attempted, but the runtime network timed out while contacting the npm registry, so a fresh `next build` could not be completed in this container. This was a dependency download timeout rather than a project verification failure.
