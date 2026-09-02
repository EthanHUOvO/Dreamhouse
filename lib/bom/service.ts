import { getAiProvider } from '../ai/provider'
import type { BomAiEnrichment, DetailedBomDocument, DesignVersion, DrawingSource, UserProfile } from '../types'
import { createBomDraft, getMaterialCatalog, getManufacturingRules, getSceneGeometry, validateBom } from './tools'

export type BomGenerationInput={design:DesignVersion;profile?:UserProfile;drawing?:DrawingSource}

export function applyBomEnrichment(doc:DetailedBomDocument,enrichment:BomAiEnrichment,provider:'mock'|'qwen'):DetailedBomDocument{
  const byId=new Map(enrichment.items.map(x=>[x.itemId,x]))
  const items=doc.items.map(item=>{const ai=byId.get(item.id);if(!ai)return item;return{...item,material:ai.material?.trim()||item.material,finish:ai.finish?.trim()||item.finish,process:ai.process?.trim()||item.process,installationMethod:ai.installationMethod?.trim()||item.installationMethod,performance:Array.isArray(ai.performance)?ai.performance:item.performance,notes:[item.notes,ai.notes].filter(Boolean).join('；')||undefined}})
  return{...doc,items,aiStatus:'enriched',aiProvider:provider,updatedAt:new Date().toISOString()}
}

export async function generateDetailedBom(input:BomGenerationInput):Promise<DetailedBomDocument>{
  let doc=createBomDraft(input)
  const provider=getAiProvider()
  if(process.env.BOM_AI_ENABLED==='false'){
    doc={...doc,aiStatus:'skipped',aiProvider:provider.id,updatedAt:new Date().toISOString()}
  }else{
    try{
      const enrichment=await provider.enrichBom({profile:input.profile,drawing:input.drawing,design:input.design,geometry:getSceneGeometry(input.design.scene),draftItems:doc.items,materialCatalog:getMaterialCatalog(),manufacturingRules:getManufacturingRules()})
      doc=applyBomEnrichment(doc,enrichment,provider.id)
    }catch(error){
      doc={...doc,aiStatus:'failed',aiProvider:provider.id,aiError:error instanceof Error?error.message:String(error),updatedAt:new Date().toISOString()}
    }
  }
  return validateBom(doc)
}
