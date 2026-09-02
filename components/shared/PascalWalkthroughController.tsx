'use client'

import { useEffect,useRef } from 'react'
import { useFrame,useThree } from '@react-three/fiber'
import { useScene } from '@pascal-app/core'
import { useViewer } from '@pascal-app/viewer'
import type { SceneGraph } from '@/lib/types'
import {
  findWalkthroughDoorTarget,
  resolveWalkthroughMove,
  resolveWalkthroughSpawn,
  WALKTHROUGH_RUN_SPEED,
  WALKTHROUGH_WALK_SPEED,
} from '@/lib/walkthrough-runtime'

type Props={
  scene:SceneGraph
  active:boolean
  onExit?:()=>void
  onPointerLockChange?:(locked:boolean)=>void
  onReadyChange?:(ready:boolean)=>void
}

export default function PascalWalkthroughController({scene,active,onExit,onPointerLockChange,onReadyChange}:Props){
  const {camera,gl}=useThree()
  const keys=useRef(new Set<string>())
  const yaw=useRef(0)
  const pitch=useRef(0)
  const player=useRef({x:0,z:0})
  const openDoors=useRef(new Set<string>())
  const targetDoor=useRef<string|null>(null)
  const hadPointerLock=useRef(false)
  const exitRef=useRef(onExit)
  const lockRef=useRef(onPointerLockChange)
  const readyRef=useRef(onReadyChange)
  const sceneRef=useRef(scene)

  useEffect(()=>{exitRef.current=onExit},[onExit])
  useEffect(()=>{lockRef.current=onPointerLockChange},[onPointerLockChange])
  useEffect(()=>{readyRef.current=onReadyChange},[onReadyChange])
  useEffect(()=>{sceneRef.current=scene},[scene])

  function markDoorDirty(doorId:string){
    const store:any=useScene.getState()
    store.dirtyNodes?.add?.(doorId)
    const node:any=store.nodes?.[doorId]
    if(node?.parentId)store.dirtyNodes?.add?.(node.parentId)
  }

  function setDoorOpen(doorId:string,open:boolean){
    const original:any=sceneRef.current.nodes[doorId]
    if(original?.type!=='door')return
    const store:any=useScene.getState()
    const current:any=store.nodes?.[doorId]??original
    if(current.doorType==='hinged'||current.doorType==='double'||current.doorType==='french'){
      store.updateNode?.(doorId,{swingAngle:open?Math.PI/2:0})
    }else{
      store.updateNode?.(doorId,{operationState:open?1:0})
    }
    markDoorDirty(doorId)
    if(open)openDoors.current.add(doorId)
    else openDoors.current.delete(doorId)
  }

  function toggleTargetDoor(){
    const id=targetDoor.current
    if(!id)return
    setDoorOpen(id,!openDoors.current.has(id))
  }

  useEffect(()=>{
    if(!active)return
    const canvas=gl.domElement
    const spawn=resolveWalkthroughSpawn(sceneRef.current)
    yaw.current=spawn.yaw
    pitch.current=0
    player.current={x:spawn.x,z:spawn.z}
    hadPointerLock.current=false
    keys.current.clear()
    openDoors.current.clear()
    targetDoor.current=null

    const perspective:any=camera
    const oldFov=perspective.isPerspectiveCamera?perspective.fov:null
    const oldNear=perspective.isPerspectiveCamera?perspective.near:null
    if(perspective.isPerspectiveCamera){
      perspective.fov=72
      perspective.near=0.05
      perspective.updateProjectionMatrix()
    }

    // Critical: entering walkthrough immediately moves the *same Pascal camera*
    // to the indoor spawn point. Pointer lock is only for mouse-look; it is no
    // longer responsible for switching the camera into first person.
    camera.position.set(spawn.x,spawn.eyeY,spawn.z)
    camera.rotation.order='YXZ'
    camera.rotation.set(0,spawn.yaw,0,'YXZ')
    camera.updateMatrixWorld(true)
    canvas.tabIndex=0
    canvas.focus({preventScroll:true})
    canvas.dataset.walkthrough='true'
    canvas.style.cursor='crosshair'
    canvas.style.touchAction='none'
    useViewer.getState().setHoveredId(null)
    readyRef.current?.(true)

    const isTyping=(target:EventTarget|null)=>target instanceof HTMLInputElement||target instanceof HTMLTextAreaElement||target instanceof HTMLSelectElement
    const onKeyDown=(event:KeyboardEvent)=>{
      if(isTyping(event.target))return
      if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(event.code)){
        event.preventDefault();keys.current.add(event.code);return
      }
      if(event.code==='KeyE'||event.code==='KeyR'){
        event.preventDefault();toggleTargetDoor();return
      }
      if(event.code==='Escape'){
        event.preventDefault()
        if(document.pointerLockElement===canvas)document.exitPointerLock()
        else exitRef.current?.()
      }
    }
    const onKeyUp=(event:KeyboardEvent)=>{keys.current.delete(event.code)}
    const onMouseMove=(event:MouseEvent)=>{
      if(document.pointerLockElement!==canvas)return
      yaw.current-=event.movementX*0.0021
      pitch.current=Math.max(-1.48,Math.min(1.48,pitch.current-event.movementY*0.0021))
    }
    const onMouseDown=(event:MouseEvent)=>{
      if(event.target!==canvas)return
      if(document.pointerLockElement!==canvas){
        const result:any=canvas.requestPointerLock?.()
        result?.catch?.(()=>{})
        return
      }
      if(event.button===0){event.preventDefault();toggleTargetDoor()}
    }
    const onLockChange=()=>{
      const locked=document.pointerLockElement===canvas
      lockRef.current?.(locked)
      if(locked){hadPointerLock.current=true;canvas.focus({preventScroll:true});return}
      if(hadPointerLock.current)exitRef.current?.()
    }
    const onBlur=()=>keys.current.clear()

    document.addEventListener('keydown',onKeyDown,true)
    document.addEventListener('keyup',onKeyUp,true)
    document.addEventListener('mousemove',onMouseMove)
    canvas.addEventListener('mousedown',onMouseDown,true)
    document.addEventListener('pointerlockchange',onLockChange)
    window.addEventListener('blur',onBlur)

    return()=>{
      document.removeEventListener('keydown',onKeyDown,true)
      document.removeEventListener('keyup',onKeyUp,true)
      document.removeEventListener('mousemove',onMouseMove)
      canvas.removeEventListener('mousedown',onMouseDown,true)
      document.removeEventListener('pointerlockchange',onLockChange)
      window.removeEventListener('blur',onBlur)
      keys.current.clear()
      targetDoor.current=null
      useViewer.getState().setHoveredId(null)
      // Door opening is an experience-only state: restore the design snapshot on exit.
      for(const id of openDoors.current){
        const original:any=sceneRef.current.nodes[id]
        const store:any=useScene.getState()
        if(original?.doorType==='hinged'||original?.doorType==='double'||original?.doorType==='french')store.updateNode?.(id,{swingAngle:Number(original.swingAngle??0)})
        else store.updateNode?.(id,{operationState:Number(original?.operationState??0)})
        markDoorDirty(id)
      }
      openDoors.current.clear()
      delete canvas.dataset.walkthrough
      canvas.style.cursor=''
      canvas.style.touchAction=''
      lockRef.current?.(false)
      readyRef.current?.(false)
      if(document.pointerLockElement===canvas)document.exitPointerLock()
      if(perspective.isPerspectiveCamera){
        if(oldFov!==null)perspective.fov=oldFov
        if(oldNear!==null)perspective.near=oldNear
        perspective.updateProjectionMatrix()
      }
    }
  },[active,camera,gl])

  useFrame((_,rawDelta)=>{
    if(!active)return
    const delta=Math.min(rawDelta,0.05)
    const pressed=keys.current
    const forward=(pressed.has('KeyW')||pressed.has('ArrowUp')?1:0)-(pressed.has('KeyS')||pressed.has('ArrowDown')?1:0)
    const strafe=(pressed.has('KeyD')||pressed.has('ArrowRight')?1:0)-(pressed.has('KeyA')||pressed.has('ArrowLeft')?1:0)
    if(forward||strafe){
      const length=Math.hypot(forward,strafe)||1
      const f=forward/length,s=strafe/length
      const fx=-Math.sin(yaw.current),fz=-Math.cos(yaw.current)
      const rx=Math.cos(yaw.current),rz=-Math.sin(yaw.current)
      const speed=pressed.has('ShiftLeft')||pressed.has('ShiftRight')?WALKTHROUGH_RUN_SPEED:WALKTHROUGH_WALK_SPEED
      const desired={
        x:player.current.x+(fx*f+rx*s)*speed*delta,
        z:player.current.z+(fz*f+rz*s)*speed*delta,
      }
      player.current=resolveWalkthroughMove(sceneRef.current,player.current,desired,openDoors.current)
    }
    const spawn=resolveWalkthroughSpawn(sceneRef.current)
    camera.position.set(player.current.x,spawn.eyeY,player.current.z)
    camera.rotation.order='YXZ'
    camera.rotation.set(pitch.current,yaw.current,0,'YXZ')
    camera.updateMatrixWorld(true)

    const nextTarget=findWalkthroughDoorTarget(sceneRef.current,player.current,yaw.current)
    if(nextTarget!==targetDoor.current){
      targetDoor.current=nextTarget
      useViewer.getState().setHoveredId(nextTarget)
    }
  },3)

  return null
}
