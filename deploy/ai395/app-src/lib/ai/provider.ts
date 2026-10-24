import type { AiDesignProposal, AiLayoutRun, BomAiEnrichment, DetailedBomItem, DesignVersion, DrawingSource, UserProfile, VisualConcept, VideoConcept } from '../types'
import { createMockProvider } from './mock-provider'
import { createQwenProvider } from './qwen-provider'
import { getAiMode, qwenConfigured } from './config'

export type PlanRequest={profile:UserProfile;drawing?:DrawingSource;currentScenario?:string}
export type LayoutRequest={profile?:UserProfile;drawing?:DrawingSource;design:DesignVersion;prompt:string}
export type RenderRequest={profile:UserProfile;style:string;room:string;roomId?:string;proposal?:AiDesignProposal;sourceImage?:string}
export type VideoRequest={profile:UserProfile;prompt:string;imageDataUrl?:string}
export type BomEnrichmentRequest={profile?:UserProfile;drawing?:DrawingSource;design:DesignVersion;geometry:any;draftItems:DetailedBomItem[];materialCatalog:any;manufacturingRules:any}

export interface AiProvider{
  id:'mock'|'qwen'
  generatePlans(input:PlanRequest):Promise<AiDesignProposal[]>
  generateLayout(input:LayoutRequest):Promise<AiLayoutRun>
  generateVisual(input:RenderRequest):Promise<VisualConcept>
  generateVideo(input:VideoRequest):Promise<VideoConcept>
  enrichBom(input:BomEnrichmentRequest):Promise<BomAiEnrichment>
}

export function getAiProvider():AiProvider{
  const mode=getAiMode()
  if(mode==='mock')return createMockProvider()
  if(qwenConfigured())return createQwenProvider()
  if(mode==='qwen')return createQwenProvider() // makes missing-key failures visible in strict Qwen mode
  return createMockProvider()
}
