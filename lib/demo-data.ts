export type ResidenceType = 'one' | 'two' | 'three'
export type PortalStage = 1 | 2 | 3 | 4 | 5

export type RoomRender = {
  name: string
  image: string
  desc: string
}

export type GeneratedLayout = {
  title: string
  summary: string
  prompt: string
  originalPlan: string
  generatedPlan: string
  rooms: string[]
}

export type GeneratedImages = {
  overallRender: string
  roomRenders: RoomRender[]
}

export type BomItem = {
  category: string
  name: string
  spec: string
  unit: string
  quantity: number
  note: string
}

export type GeneratedBom = {
  code: string
  projectName: string
  printSheets: string[]
  items: BomItem[]
  sampleDownloads: { label: string; href: string }[]
}

export const residenceOptions = [
  {
    key: 'one' as ResidenceType,
    label: '一居室',
    subtitle: '适合单人或轻量改造演示',
    cover: '/preset/one-bedroom/original.png',
    defaultPrompt: '在这张图的基础上，整体户型变成升级成一室一厅二卫一厨的格局。',
    quickActions: [
      '增加一个卫生间',
      '增加一个卧室',
      '保留主体结构，仅微调厨房与卫生间',
    ],
  },
  {
    key: 'two' as ResidenceType,
    label: '二居室',
    subtitle: '适合二居升三居方案演示',
    cover: '/preset/initial-two-bedroom.png',
    defaultPrompt: '在这张图的基础上，整体户型升级成三室一厅一卫一厨的格局。',
    quickActions: [
      '增加一个卧室',
      '增加儿童房',
      '增加书房并优化客餐厅动线',
    ],
  },
  {
    key: 'three' as ResidenceType,
    label: '三居室',
    subtitle: '适合改善型家庭优化演示',
    cover: '/preset/generated-plan-01.png',
    defaultPrompt: '在这张图的基础上优化三居室布局，提升收纳、卫生间与家庭活动空间。',
    quickActions: [
      '双卫优化',
      '儿童房 + 书房联动',
      '保姆房 / 储物空间优化',
    ],
  },
]

export const promptExamples: Record<ResidenceType, string[]> = {
  one: [
    '在这张图的基础上，整体户型变成升级成一室一厅二卫一厨的格局。',
    '保持原始外轮廓不变，把储物间改为第二卫生间，并生成更新后的平面方案。',
    '在原一居基础上增加一个独立卧室，并保持厨房和客餐厅动线通畅。',
  ],
  two: [
    '在这张图的基础上，整体户型升级成三室一厅一卫一厨的格局。',
    '保持外墙不变，在右侧空间隔出儿童房和书房，形成三居方案。',
    '将二居改造成适合三口之家的布局，并优化卫生间与餐客厅关系。',
  ],
  three: [
    '在现有三居的基础上，优化主卧套卫与儿童房功能，生成新的平面图。',
    '保留承重墙，重构次卧与书房关系，增加收纳空间。',
    '将三居室优化为更适合四口之家的三居双卫布局。',
  ],
}

export function getMockLayout(residenceType: ResidenceType, prompt: string): GeneratedLayout {
  if (residenceType === 'one' && prompt.includes('卧室')) {
    return {
      title: '一居升级 · 二室一厅二卫一厨',
      summary: '基于原始一居室，在不改变外轮廓的前提下新增一个卧室，并同步形成双卫布局。',
      prompt,
      originalPlan: '/preset/one-bedroom/original.png',
      generatedPlan: '/preset/one-bedroom/add-bedroom/plan-02.png',
      rooms: ['主卧', '次卧', '客餐厅', '厨房', '主卫', '客卫', '阳台'],
    }
  }

  if (residenceType === 'one') {
    return {
      title: '一居升级 · 一室一厅二卫一厨',
      summary: '通过调整储物间与卫浴关系，生成双卫版本的一居室方案。',
      prompt,
      originalPlan: '/preset/one-bedroom/original.png',
      generatedPlan: '/preset/one-bedroom/plan-01.png',
      rooms: ['主卧', '客餐厅', '厨房', '主卫', '客卫', '阳台'],
    }
  }

  if (residenceType === 'two') {
    return {
      title: '二居升级 · 三室一厅一卫一厨',
      summary: '基于现有二居室演示模板，新增一个独立卧室并保留公共空间。',
      prompt,
      originalPlan: '/preset/initial-two-bedroom.png',
      generatedPlan: '/preset/generated-plan-01.png',
      rooms: ['主卧', '次卧', '儿童房', '客餐厅', '厨房', '卫生间'],
    }
  }

  return {
    title: '三居优化 · 三居双卫改善方案',
    summary: '保持三居主体框架，对家庭功能进行优化，适合后续渲染与 BOM 演示。',
    prompt,
    originalPlan: '/preset/generated-plan-02.png',
    generatedPlan: '/preset/generated-plan-02.png',
    rooms: ['主卧', '儿童房', '书房', '客厅', '厨房', '主卫', '公卫'],
  }
}

export function getMockImages(layout: GeneratedLayout): GeneratedImages {
  const overall = layout.generatedPlan.includes('one-bedroom')
    ? '/preset/one-bedroom/add-bedroom/render-02.webp'
    : '/preset/generated-render.png'

  return {
    overallRender: overall,
    roomRenders: [
      { name: '客餐厅', image: overall, desc: '展示客餐厅整体风格、动线与主要家具布置。' },
      { name: '主卧', image: overall, desc: '展示主卧床、衣柜、床头布置与采光方向。' },
      { name: '卫生间', image: overall, desc: '展示卫浴洁具布置、干湿分离与开门关系。' },
    ],
  }
}

export function getMockBom(layout: GeneratedLayout): GeneratedBom {
  const twoBath = layout.rooms.includes('客卫') || layout.rooms.includes('公卫')
  return {
    code: `BOM-${Date.now().toString().slice(-6)}`,
    projectName: layout.title,
    printSheets: ['方案总表', '墙体改造表', '门窗清单', '家具配置表', '预算汇总表'],
    items: [
      { category: '墙体改造', name: '轻质隔墙', spec: '100mm', unit: 'm²', quantity: 18.5, note: '新增卧室/卫浴隔墙' },
      { category: '门窗', name: '室内门', spec: '900×2100', unit: '樘', quantity: twoBath ? 4 : 3, note: '含新增房门' },
      { category: '卫浴', name: '坐便器', spec: '标准型', unit: '套', quantity: twoBath ? 2 : 1, note: '根据卫浴数量配置' },
      { category: '卫浴', name: '洗手盆', spec: '台下盆', unit: '套', quantity: twoBath ? 2 : 1, note: '含龙头与台面' },
      { category: '厨房', name: '橱柜', spec: '定制', unit: '延米', quantity: 5.6, note: '沿厨房一侧布置' },
      { category: '家具', name: '床', spec: '双人床/单人床组合', unit: '张', quantity: layout.rooms.includes('次卧') || layout.rooms.includes('儿童房') ? 2 : 1, note: '按卧室数量估算' },
      { category: '家具', name: '衣柜', spec: '定制', unit: '组', quantity: 2, note: '卧室储物' },
      { category: '饰面', name: '乳胶漆', spec: '环保型', unit: 'm²', quantity: 92, note: '室内墙顶面估算' },
    ],
    sampleDownloads: [
      { label: 'PC构件BOM示例', href: '/bom/pc-components-bom-52sqm.xlsx' },
      { label: '全屋BOM与预算示例', href: '/bom/whole-house-bom-budget-52sqm.xlsx' },
    ],
  }
}
