import { NextResponse } from 'next/server'
async function probe(url:string|undefined){if(!url)return{mode:'mock',online:false};try{const r=await fetch(`${url.replace(/\/$/,'')}/status`,{cache:'no-store'});if(!r.ok)throw new Error(String(r.status));return{mode:'external',online:true,data:await r.json()}}catch{return{mode:'external',online:false}}}
export async function GET(){const[simulation,printer,robot]=await Promise.all([probe(process.env.SIMULATION_API_URL),probe(process.env.PRINTER_API_URL),probe(process.env.ROBOT_API_URL)]);return NextResponse.json({simulation,printer,robot})}
