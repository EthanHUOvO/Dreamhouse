import { applyFurnitureOverrides } from './furniture-overrides'
import { createScenarioScene } from './scenarios'
import type { FurnitureOverrides, ScenarioType } from './types'

export function buildDesignScene(scenario:ScenarioType,overrides:FurnitureOverrides={}){
  return applyFurnitureOverrides(createScenarioScene(scenario),overrides)
}
