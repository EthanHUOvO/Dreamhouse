import { getAiProvider } from '../ai/provider'
import { createMockProvider } from '../ai/mock-provider'
import { getAiConfig,getAiMode } from '../ai/config'
import type { BomAiEnrichment, DetailedBomDocument, DesignVersion, DrawingSource, UserProfile } from '../types'
import { createBomDraft, getMaterialCatalog, getManufacturingRules, getSceneGeometry, validateBom } from './tools'

export type BomGenerationInput={design:DesignVersion;profile?:UserProfile;drawing?:DrawingSource}

export function applyBomEnrichment(doc:DetailedBomDocument,enrichment:BomAiEnrichment,provider:'mock'|'qwen'):DetailedBomDocument{
  const byId=new Map(enrichment.items.map(x=>[x.itemId,x]))
  const items=doc.items.map(item=>{const ai=byId.get(item.id);if(!ai)return item;return{...item,material:ai.material?.trim()||item.material,finish:ai.finish?.trim()||item.finish,process:ai.process?.trim()||item.process,installationMethod:ai.installationMethod?.trim()||item.installationMethod,performance:Array.isArray(ai.performance)?ai.performance:item.performance,notes:[item.notes,ai.notes].filter(Boolean).join('；')||undefined}})
  return{...doc,items,aiStatus:'enriched',aiProvider:provider,updatedAt:new Date().toISOString()}
}

function enrichmentInput(input:BomGenerationInput,doc:DetailedBomDocument){
  return{profile:input.profile,drawing:input.drawing,design:input.design,geometry:getSceneGeometry(input.design.scene),draftItems:doc.items,materialCatalog:getMaterialCatalog(),manufacturingRules:getManufacturingRules()}
}

export async function generateDetailedBom(input:BomGenerationInput):Promise<DetailedBomDocument>{
  let doc=createBomDraft(input)
  const provider=getAiProvider(),mode=getAiMode(),cfg=getAiConfig()
  if(process.env.BOM_AI_ENABLED==='false')return validateBom({...doc,aiStatus:'skipped',aiProvider:provider.id,updatedAt:new Date().toISOString()})
  try{
    const enrichment=await provider.enrichBom(enrichmentInput(input,doc))
    doc=applyBomEnrichment(doc,enrichment,provider.id)
  }catch(error){
    console.error('[DreamHouse][bom][ai]',{model:cfg.bomModel,provider:provider.id,message:error instanceof Error?error.message:String(error)})
    if(provider.id==='qwen'&&mode==='hybrid'){
      try{
        const fallback=await createMockProvider().enrichBom(enrichmentInput(input,doc))
        doc=applyBomEnrichment(doc,fallback,'mock')
        doc={...doc,aiError:`Qwen BOM enrichment failed; local fallback used. ${error instanceof Error?error.message:String(error)}`}
      }catch(fallbackError){
        doc={...doc,aiStatus:'failed',aiProvider:'qwen',aiError:String(fallbackError),updatedAt:new Date().toISOString()}
      }
    }else if(provider.id==='qwen'&&mode==='qwen'){
      throw error
    }else{
      doc={...doc,aiStatus:'failed',aiProvider:provider.id,aiError:error instanceof Error?error.message:String(error),updatedAt:new Date().toISOString()}
    }
  }
  return validateBom(doc)
}
