import type { FamilyPlan, HouseholdType, ScenarioType, SingleGender, UserProfile } from './types'

const PROFILE_KEY='dreamhouse.v11.userProfiles'
const ACTIVE_PROJECT_KEY='dreamhouse.v11.activeProjectId'

export function scenarioFromProfile(input:{household:HouseholdType;singleGender?:SingleGender;familyPlan?:FamilyPlan}):ScenarioType{
  if(input.household==='single')return input.singleGender==='female'?'single_female':'single'
  if(input.household==='couple')return 'couple'
  return input.familyPlan==='nanny'?'nanny':'child'
}
export function normalizeProfile(profile:Partial<UserProfile>&{displayName:string;household:HouseholdType}):UserProfile{
  const now=new Date().toISOString();const scenario=scenarioFromProfile(profile)
  const adults=profile.household==='single'?1:2
  const children=profile.household==='family3'?1:0
  return{
    id:profile.id||`USR-${Date.now()}`,displayName:profile.displayName||'住户',household:profile.household,singleGender:profile.household==='single'?(profile.singleGender||'male'):undefined,familyPlan:profile.household==='family3'?(profile.familyPlan||'child'):undefined,
    adults,children,nanny:profile.household==='family3'&&profile.familyPlan==='nanny',workFromHome:Boolean(profile.workFromHome),storagePriority:profile.storagePriority||'normal',preferredStyle:profile.preferredStyle||'modern',preferredScenario:scenario,createdAt:profile.createdAt||now,updatedAt:now
  }
}
export function loadProfiles():UserProfile[]{if(typeof window==='undefined')return[];try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||'[]')}catch{return[]}}
export function saveProfiles(v:UserProfile[]){if(typeof window!=='undefined')localStorage.setItem(PROFILE_KEY,JSON.stringify(v))}
export function getProfile(id?:string){return id?loadProfiles().find(p=>p.id===id):undefined}
export function upsertProfile(profile:UserProfile){const list=loadProfiles(),i=list.findIndex(p=>p.id===profile.id),next={...profile,updatedAt:new Date().toISOString()};if(i>=0)list[i]=next;else list.push(next);saveProfiles(list);return next}
export function createProfile(input:Partial<UserProfile>&{displayName:string;household:HouseholdType}){return upsertProfile(normalizeProfile(input))}
export function setActiveProjectId(id:string){if(typeof window!=='undefined')localStorage.setItem(ACTIVE_PROJECT_KEY,id)}
export function getActiveProjectId(){return typeof window==='undefined'?null:localStorage.getItem(ACTIVE_PROJECT_KEY)}
