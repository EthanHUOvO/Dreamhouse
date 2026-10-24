# lib/ai/image-service.ts:32

- 步骤：step2
- 文件：`lib/ai/image-service.ts`
- 行号：32
- 变量/位置：`BASE_FLOOR_PLAN_EDIT_PROMPT`
- 类型：template 字符串
- 字数：220

> 户型图编辑总提示词（含 {modificationRequest} 注入点）

## 实际提示词（逐字）

```text
编辑参考图 <image1> 的二维户型，只执行以下明确修改：

修改要求：
{modificationRequest}

约束：
建筑外轮廓及图中明确标示的承重结构保持原样。
修改范围外的墙体、门窗、房间、文字和尺寸数字逐一保留，位置不变。
需要新增或拆分房间时，只调整指定的非承重隔墙，保留合理门洞和通行路线。
保持二维正俯视、相同比例和线条风格。不要旋转、裁切、改成透视图或全图重绘。
不要凭空填写新尺寸或面积。只输出修改后的户型图。
```
