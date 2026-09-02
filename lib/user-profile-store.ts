import type { FamilyPlan, HouseholdChoice, ScenarioType, SingleGender, UserProfile } from './types'

const PROFILE_KEY='dreamhouse.user-profiles.v10'
const ACTIVE_ORDER_KEY='dreamhouse.active-customer-order.v10'
const PROFILE_EVENT='dreamhouse:profiles-updated'

export function scenarioFromPreferences(
  household:HouseholdChoice,
  singleGender?:SingleGender,
  familyPlan?:FamilyPlan,
):ScenarioType{
  if(household==='single')return singleGender==='female'?'single_female':'single'
  if(household==='couple')return 'couple'
  return familyPlan==='nanny'?'nanny':'child'
}

export function preferencesFromScenario(scenario:ScenarioType):{
  household:HouseholdChoice
  singleGender?:SingleGender
  familyPlan?:FamilyPlan
}{
  if(scenario==='single_female')return {household:'single',singleGender:'female'}
  if(scenario==='single')return {household:'single',singleGender:'male'}
  if(scenario==='couple')return {household:'couple'}
  if(scenario==='nanny')return {household:'family3',familyPlan:'nanny'}
  return {household:'family3',familyPlan:'child'}
}

export function loadUserProfiles():UserProfile[]{
  if(typeof window==='undefined')return []
  try{
    const raw=localStorage.getItem(PROFILE_KEY)
    return raw?JSON.parse(raw):[]
  }catch{return []}
}

export function saveUserProfiles(profiles:UserProfile[]){
  if(typeof window==='undefined')return
  localStorage.setItem(PROFILE_KEY,JSON.stringify(profiles))
  window.dispatchEvent(new CustomEvent(PROFILE_EVENT))
}

export function createUserProfile(input:{
  displayName:string
  household:HouseholdChoice
  singleGender?:SingleGender
  familyPlan?:FamilyPlan
}):UserProfile{
  const now=new Date().toISOString()
  const profile:UserProfile={
    id:`USR-${Date.now()}`,
    displayName:input.displayName.trim()||'住户',
    household:input.household,
    singleGender:input.household==='single'?(input.singleGender??'male'):undefined,
    familyPlan:input.household==='family3'?(input.familyPlan??'child'):undefined,
    preferredScenario:scenarioFromPreferences(input.household,input.singleGender,input.familyPlan),
    createdAt:now,
    updatedAt:now,
  }
  saveUserProfiles([profile,...loadUserProfiles()])
  return profile
}

export function getUserProfile(profileId:string|undefined):UserProfile|undefined{
  if(!profileId)return undefined
  return loadUserProfiles().find(profile=>profile.id===profileId)
}

export function updateUserProfileScenario(profileId:string|undefined,scenario:ScenarioType){
  if(!profileId)return
  const profiles=loadUserProfiles()
  if(scenario==='replan'){
    if(!profiles.some(profile=>profile.id===profileId))return
    saveUserProfiles(profiles.map(profile=>profile.id===profileId?{...profile,preferredScenario:scenario,updatedAt:new Date().toISOString()}:profile))
    return
  }
  const preferences=preferencesFromScenario(scenario)
  if(!profiles.some(profile=>profile.id===profileId))return
  saveUserProfiles(profiles.map(profile=>profile.id===profileId?{
    ...profile,
    ...preferences,
    preferredScenario:scenario,
    updatedAt:new Date().toISOString(),
  }:profile))
}

export function formatUserProfile(profile:UserProfile|undefined){
  if(!profile)return ''
  if(profile.household==='single')return `单身贵族 · ${profile.singleGender==='female'?'女士':'男士'}`
  if(profile.household==='couple')return '双人世界'
  return profile.familyPlan==='nanny'?'三口之家 · 育儿 + 保姆':'三口之家 · 育儿家庭'
}

export function setActiveCustomerOrderId(orderId:string){
  if(typeof window!=='undefined')localStorage.setItem(ACTIVE_ORDER_KEY,orderId)
}
export function getActiveCustomerOrderId(){
  if(typeof window==='undefined')return null
  return localStorage.getItem(ACTIVE_ORDER_KEY)
}
