import type { RenovationPlan, SceneGraph } from './types'
import { planWithRules } from './rule-planner'
import { planWithLLM } from './llm-planner'
export async function createRenovationPlan(prompt:string,scene:SceneGraph):Promise<RenovationPlan>{
  return (process.env.PLANNER_MODE??'rules').toLowerCase()==='llm' ? planWithLLM(prompt,scene) : planWithRules(prompt,scene)
}
