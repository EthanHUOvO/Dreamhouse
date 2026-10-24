import { createInitialHouseScene } from './house-scene'
import type { SceneGraph } from './types'

export type HouseTemplate={id:string;name:string;areaLabel:string;description:string;createBaseScene:()=>SceneGraph}
export const HOUSE_TEMPLATES:Record<string,HouseTemplate>={
  HOUSE_001:{id:'HOUSE_001',name:'80㎡ Demo住宅',areaLabel:'约80㎡',description:'当前唯一演示模板。外墙与承重墙稳定，支持房间功能、卫生间局部隔墙和家具变化。',createBaseScene:createInitialHouseScene}
}
export function getHouseTemplate(id='HOUSE_001'){return HOUSE_TEMPLATES[id]??HOUSE_TEMPLATES.HOUSE_001}
