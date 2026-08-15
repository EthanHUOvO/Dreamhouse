import type { RenovationPlan, SceneGraph } from './types'

export function planWithRules(prompt:string, scene:SceneGraph): RenovationPlan {
  const p=prompt.trim()
  if ((p.includes('电竞')||p.includes('游戏')) && (p.includes('衣帽')||p.includes('更衣'))) return {
    title:'电竞房转换为衣帽间', summary:'保持房间几何不变，仅修改房间语义；家具可继续在 Pascal 中替换。',
    operations:[{type:'resemanticize_room',roomId:'zone_gaming',newName:'衣帽间',newSemantic:'dressing_room'}], warnings:[]
  }
  if (p.includes('卫生间') && p.includes('主卫') && p.includes('公卫')) return {
    title:'卫生间拆分为主卫和公卫', summary:'在原卫生间中增加一面非承重隔墙，并拆分房间语义。',
    operations:[{type:'split_room',roomId:'zone_bath',axis:'x',ratio:.5,rooms:[
      {id:'zone_master_bath',name:'主卫',semantic:'master_bathroom'},
      {id:'zone_public_bath',name:'公卫',semantic:'public_bathroom'}]}],
    warnings:['展示级空间拓扑演示；真实卫生间改造还需校核给排水、通风、防水与规范。']
  }
  if ((p.includes('拆')||p.includes('清空')) && (p.includes('非承重')||p.includes('隔墙'))) return {
    title:'清空可变室内隔墙', summary:'保留外轮廓和承重墙，移除所有可编辑非承重隔墙及旧房间 Zone。',
    operations:[{type:'remove_all_partitions'}], warnings:['执行后进入住宅空壳状态，需要在 Pascal 中重新画隔墙和房间区域。']
  }
  if (p.includes('结婚')||p.includes('两个人')||p.includes('伴侣')) return {
    title:'两人共同居住方案', summary:'电竞房转衣帽间，书房转双人书房；固定结构不变。',
    operations:[
      {type:'resemanticize_room',roomId:'zone_gaming',newName:'衣帽间',newSemantic:'dressing_room'},
      {type:'resemanticize_room',roomId:'zone_study',newName:'双人书房',newSemantic:'shared_study'}
    ], warnings:[]
  }
  if (p.includes('孩子')||p.includes('宝宝')||p.includes('育儿')) {
    const operations: RenovationPlan['operations']=[
      {type:'resemanticize_room',roomId:'zone_gaming',newName:'儿童房',newSemantic:'child_room'}
    ]
    if (scene.nodes.zone_bath) operations.push({type:'split_room',roomId:'zone_bath',axis:'x',ratio:.5,rooms:[
      {id:'zone_master_bath',name:'主卫',semantic:'master_bathroom'},
      {id:'zone_public_bath',name:'公卫',semantic:'public_bathroom'}
    ]})
    if (p.includes('保姆')) operations.push({type:'resemanticize_room',roomId:'zone_study',newName:'保姆房',newSemantic:'nanny_room'})
    return {title:'育儿家庭空间重构',summary:'将可变房间重新赋予育儿阶段语义，并按需拆分卫生间。',operations,
      warnings:['展示级改造方案，不替代结构、消防、给排水和建筑规范校核。']}
  }
  return {title:'未匹配到规则',summary:'规则模式只覆盖几个演示指令；切换 LLM 模式可获得更自由的自然语言理解。',operations:[],warnings:[
    '可尝试：把电竞房改成衣帽间','可尝试：把卫生间切成主卫和公卫','可尝试：拆除所有非承重隔墙','可尝试：家里有孩子了，还需要一个保姆房'
  ]}
}
