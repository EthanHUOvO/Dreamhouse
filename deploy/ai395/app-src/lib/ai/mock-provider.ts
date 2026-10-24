import type { AiDesignProposal, BomAiEnrichment, ScenarioType, UserProfile, VisualConcept, VideoConcept } from '../types'
import type { AiProvider, BomEnrichmentRequest, LayoutRequest, PlanRequest, RenderRequest, VideoRequest } from './provider'
import { runMockLayoutAgent } from './mock-layout-agent'

function preferred(profile:UserProfile):ScenarioType{return profile.preferredScenario}
function baseTitle(s:ScenarioType){
  return s==='single'?'单身男性 · 电竞房':s==='single_female'?'单身女性 · 衣帽间':s==='couple'?'双人世界':s==='child'?'三口之家 · 育儿':s==='nanny'?'育儿 + 保姆':'弹性重组'
}
function proposal(profile:UserProfile,strategy:'balanced'|'storage'|'growth',index:number):AiDesignProposal{
  const s=preferred(profile)
  const titles={balanced:'平衡生活方案',storage:'收纳优先方案',growth:'成长弹性方案'} as const
  const summaries={
    balanced:`以 ${baseTitle(s)} 为基础，优先保持外墙和主要隔墙稳定，通过房间功能与家具调整满足当前家庭结构。`,
    storage:'不扩大墙体改动，重点通过衣柜、收纳柜和家具朝向优化提高储物效率。',
    growth:'保留未来变化余量，尽量让书房、兴趣房或儿童房可以随家庭阶段切换。'
  } as const
  return{
    id:`AI-${strategy}-${Date.now()}-${index}`,title:titles[strategy],summary:summaries[strategy],scenario:s,strategy,
    goals:strategy==='storage'?['提高收纳密度','保持主要结构稳定','家具不遮挡门窗']:strategy==='growth'?['支持生命周期变化','减少固定墙体改造','预留未来功能切换']:['满足当前家庭结构','保证主要动线','控制墙体变化'],
    roomChanges:s==='couple'?['兴趣房 → 衣帽间','书房 → 双人书房']:s==='child'?['兴趣房 → 儿童房','卫生间 → 主卫/公卫']:s==='nanny'?['兴趣房 → 儿童房','书房 → 保姆房','卫生间 → 主卫/公卫']:s==='single_female'?['兴趣房 → 衣帽间','书房保持不变']:['保留电竞房','保留单人书房'],
    wallChanges:s==='child'||s==='nanny'?['仅卫生间增加局部非承重隔墙','外墙和承重墙保持不变']:['外墙和承重墙保持不变','不主动新增主要隔墙'],
    furnitureAdvice:strategy==='storage'?['衣柜靠墙并朝向房间内部','保持门口净空','优先利用内墙布置收纳']:strategy==='growth'?['采用可移动家具','避免家具长期锁死通道','儿童/书房家具可替换']:['床、柜、桌按生活动线布置','卫生间设备贴墙','保留主要通行空间'],
    score:92-index*3,provider:'mock',createdAt:new Date().toISOString()
  }
}

function svgData(style:string,room:string,title:string){
  const safe=(s:string)=>s.replace(/[<>&]/g,'')
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#eef4f5"/><stop offset="1" stop-color="#d9cfc0"/></linearGradient></defs><rect width="1280" height="720" fill="url(#g)"/><rect x="90" y="80" width="1100" height="560" rx="28" fill="#fff" opacity=".72"/><text x="140" y="170" font-size="52" font-family="Arial,sans-serif" fill="#132b35">DreamHouse AI 视觉概念</text><text x="140" y="255" font-size="34" font-family="Arial,sans-serif" fill="#39545e">${safe(room)} · ${safe(style)}</text><text x="140" y="345" font-size="28" font-family="Arial,sans-serif" fill="#68777c">${safe(title)}</text><text x="140" y="550" font-size="22" font-family="Arial,sans-serif" fill="#8a9295">Mock Preview · 接入 Qwen-Image 后替换为真实装修效果图</text></svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

export function createMockProvider():AiProvider{
  return{
    id:'mock',
    async generatePlans({profile}:PlanRequest){return[proposal(profile,'balanced',0),proposal(profile,'storage',1),proposal(profile,'growth',2)]},
    async generateLayout(input:LayoutRequest){return runMockLayoutAgent(input)},
    async generateVisual({profile,style,room,roomId,proposal}:RenderRequest):Promise<VisualConcept>{
      const title=proposal?.title||baseTitle(profile.preferredScenario)
      return{id:`VIS-${Date.now()}`,style,roomId,room,prompt:`${room}，${style}，基于 ${title}，保持真实户型边界和门窗关系。`,imageDataUrl:svgData(style,room,title),provider:'mock',status:'ready',createdAt:new Date().toISOString()}
    },
    async generateVideo({prompt}:VideoRequest):Promise<VideoConcept>{return{id:`VID-${Date.now()}`,prompt,provider:'mock',status:'queued',createdAt:new Date().toISOString()}},
    async enrichBom(input:BomEnrichmentRequest):Promise<BomAiEnrichment>{
      const childSafe=Boolean(input.profile?.children)
      return{summary:'Mock BOM enrichment：几何数量由DreamHouse计算，AI仅补充材料、工艺与施工建议。',items:input.draftItems.map(item=>{
        const wall=item.category==='wall',sanitary=item.category==='sanitary',connector=item.category==='connector'
        return{itemId:item.id,material:wall?'轻质可打印复合墙体材料':sanitary?'成品卫浴设备':connector?'镀锌标准连接件':item.material,finish:wall?'低VOC环保内墙涂层':item.finish,process:wall?'数字分段 + 3D打印 + 编码':item.process,installationMethod:wall?'机械臂按节点编号定位，人工复核接口':item.installationMethod,performance:[...(item.performance||[]),...(childSafe&&wall?['低VOC','儿童友好']:[])],notes:'AI建议字段；数量、尺寸和sourceNodeId均保持几何引擎原值。'}
      })}
    },
  }
}
