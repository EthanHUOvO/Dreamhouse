import fs from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";
import sharp from "sharp";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const apiKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || "";
const nativeBaseUrl = (process.env.QWEN_NATIVE_BASE_URL || "https://dashscope.aliyuncs.com/api/v1").replace(/\/$/, "");
const model = process.env.QWEN_IMAGE_MODEL || "qwen-image-3.0-pro";
if (!apiKey) throw new Error("QWEN_API_KEY is missing");

const sourcePath = path.join(process.cwd(), "public/preset/variants/one/option-01.png");
const source = await fs.readFile(sourcePath);
const metadata = await sharp(source).metadata();
const width = metadata.width;
const height = metadata.height;
if (!width || !height) throw new Error("Unable to read source dimensions");
const sourceImage = `data:image/png;base64,${source.toString("base64")}`;
const requirement = "将右上区域重新划分为卧室和儿童房，使整体形成三居布局。保持外轮廓和承重结构不变。";
const oldPrompt = `你正在进行住宅二维户型图编辑。输入图片是用户第一步选择的原始户型图。用户要求：${requirement}。请直接基于这张原始户型图完成修改。必须始终保留原始户型整体框架：保持建筑最外轮廓、承重结构、厨房、卫生间、阳台和未要求调整的空间位置不变；保持二维俯视平面图表现、原图绘图风格、合理门洞与中文房间名称；不得输出3D效果图、Pascal界面或工程调试文字。 不显示水印。`;
const concisePrompt = `请直接编辑输入的二维户型图。

修改要求：
${requirement}

约束：
保持建筑外轮廓和承重结构不变。
除用户明确要求修改的区域外，其他区域保持原样。
保持原图二维俯视户型图的比例、线条、颜色和标注风格。
新增或调整房间时，应保证墙体、门洞和空间连通关系合理。

只执行用户要求的修改，不要重新设计整张户型。`;
const negativePrompt = "改变建筑外轮廓，修改未指定区域，重新设计整张户型，三维效果图，透视图";
const variants = [
  { id: "A-old-current", prompt: oldPrompt, promptExtend: false },
  { id: "B-concise-extend", prompt: concisePrompt, promptExtend: true, negativePrompt },
  { id: "C-concise-no-extend", prompt: concisePrompt, promptExtend: false, negativePrompt },
  { id: "D-concise-no-extend-aspect", prompt: concisePrompt, promptExtend: false, negativePrompt, size: `${width}*${height}` },
];
const outputDirectory = path.join(process.cwd(), "artifacts/step2-i2i-ab");
await fs.mkdir(outputDirectory, { recursive: true });
const requestedVariants = new Set(
  (process.env.FLOORPLAN_AB_VARIANTS || variants.map((variant) => variant.id).join(","))
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);

for (const variant of variants) {
  if (!requestedVariants.has(variant.id)) continue;
  const startedAt = Date.now();
  try {
    const response = await fetch(`${nativeBaseUrl}/services/aigc/multimodal-generation/generation`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        input: { messages: [{ role: "user", content: [{ image: sourceImage }, { text: variant.prompt }] }] },
        parameters: {
          prompt_extend: variant.promptExtend,
          n: 1,
          ...(variant.size ? { size: variant.size } : {}),
          ...(variant.negativePrompt ? { negative_prompt: variant.negativePrompt } : {}),
          watermark: false,
        },
      }),
      signal: AbortSignal.timeout(300_000),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(`HTTP ${response.status} ${JSON.stringify(data).slice(0, 500)}`);
    const imageUrl = data?.output?.choices?.[0]?.message?.content?.find((item) => item?.image)?.image;
    if (!imageUrl) throw new Error("image URL missing");
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) throw new Error(`image download HTTP ${imageResponse.status}`);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const outputPath = path.join(outputDirectory, `${variant.id}.png`);
    await fs.writeFile(outputPath, imageBuffer);
    console.log(JSON.stringify({
      variant: variant.id,
      status: response.status,
      elapsedSeconds: Number(((Date.now() - startedAt) / 1000).toFixed(1)),
      model,
      imageCount: 1,
      textCount: 1,
      sourceWidth: width,
      sourceHeight: height,
      sourceBytes: source.byteLength,
      promptLength: variant.prompt.length,
      promptExtend: variant.promptExtend,
      outputSizeRequested: variant.size || "auto",
      outputWidth: data?.usage?.output_width,
      outputHeight: data?.usage?.output_height,
      outputPath,
    }));
  } catch (error) {
    console.error(JSON.stringify({
      variant: variant.id,
      status: "failed",
      elapsedSeconds: Number(((Date.now() - startedAt) / 1000).toFixed(1)),
      promptLength: variant.prompt.length,
      promptExtend: variant.promptExtend,
      outputSizeRequested: variant.size || "auto",
      error: error instanceof Error ? error.message : String(error),
    }));
  }
}
