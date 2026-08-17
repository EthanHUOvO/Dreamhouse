# Dreamhouse Dual Portal Stable Mover v2

这是为解决“页面加载失败、家具无法移动”重新制作的稳定静态版本。

## 核心变化

住户设计页不再展示数值型微调面板。3D 区右下角只有：

1. 家具下拉选择；
2. 前 / 后 / 左 / 右四个按钮；
3. 复位；
4. 保存布局。

家具高度始终锁定，只修改地面平面位置。每次移动 0.15m，并自动限制在当前房间范围内，避免家具直接移动到房间外。

基础卫生间淋浴房默认固定在卫生间左下角，靠两面墙布置；洗手台位于更靠里的墙边。

## 固定方案

- 单人居住
- 两人共同居住
- 育儿家庭
- 育儿 + 保姆
- 空间重新规划

客餐厨一体与走廊之间的墙已统一删除。

## 双门户

- `customer.html`：住户端，设计 / 施工 / 验收
- `contractor.html`：施工方端，多订单管理 + 生产 / 施工

## 无需 npm

这是纯 HTML / CSS / JavaScript 项目，不使用 npm，也不依赖 Pascal/React 构建，因此部署稳定，手机和电脑都可访问。

### 本地启动

Windows 双击：

```text
START_WINDOWS.bat
```

然后打开：

```text
http://localhost:8080/
http://localhost:8080/customer.html
http://localhost:8080/contractor.html
```

### GitHub Pages

将所有文件放到仓库根目录，Settings → Pages → Source 选择 GitHub Actions，推送 main 即可。

## 自测

项目内置页面自测：

```text
customer.html?selftest=1
contractor.html?selftest=1
```

页面 DOM 会产生隐藏的 `#selftest`，内容为 `PASS` 时表示核心交互逻辑已通过。
