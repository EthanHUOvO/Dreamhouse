'use client'

import { useEffect, useRef, useState } from 'react'
import { loadPlugin } from '@pascal-app/core'
import { applySceneSnapshot } from '@pascal-app/editor'
import { Viewer, useViewer } from '@pascal-app/viewer'
import { builtinPlugin } from '@pascal-app/nodes'
import { CameraControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { loadScene } from '@/lib/client-store'

const pluginReady = loadPlugin(builtinPlugin)

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function prepareExportRoot(root: THREE.Object3D) {
  const clone = root.clone(true)
  const remove: THREE.Object3D[] = []

  clone.traverse((obj) => {
    const renderable = obj as THREE.Mesh
    if (!renderable.isMesh) return
    if (!renderable.geometry?.getAttribute('position')) remove.push(obj)
  })

  for (const obj of remove) obj.parent?.remove(obj)
  return clone
}

/**
 * Bare Viewer does not mount Pascal Editor's ExportManager, so expose the same
 * useViewer().exportScene() API here. This keeps the existing FABRICATION tab working.
 */
function ViewerExportBridge() {
  const scene = useThree((s) => s.scene)
  const setExportScene = useViewer((s) => s.setExportScene)

  useEffect(() => {
    const exportScene = async (format: 'glb' | 'stl' | 'obj' = 'glb') => {
      const sceneGroup = scene.getObjectByName('scene-renderer')
      if (!sceneGroup) return

      const viewer = useViewer.getState()
      viewer.setExporting(true)

      try {
        // Pascal furniture can use instancing. During export Pascal swaps to
        // exportable geometry, so allow two frames for that state to commit.
        await nextFrame()
        await nextFrame()

        const root = prepareExportRoot(sceneGroup)
        const date = new Date().toISOString().slice(0, 10)

        if (format === 'stl') {
          const result = new STLExporter().parse(root, { binary: true })
          downloadBlob(new Blob([result], { type: 'model/stl' }), `HOUSE_001_${date}.stl`)
          return
        }

        if (format === 'obj') {
          const result = new OBJExporter().parse(root)
          downloadBlob(new Blob([result], { type: 'model/obj' }), `HOUSE_001_${date}.obj`)
          return
        }

        const result = await new GLTFExporter().parseAsync(root, {
          binary: true,
          onlyVisible: true,
        })
        downloadBlob(
          new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' }),
          `HOUSE_001_${date}.glb`,
        )
      } finally {
        viewer.setExporting(false)
      }
    }

    setExportScene(exportScene)
    return () => setExportScene(null)
  }, [scene, setExportScene])

  return null
}

function CameraRig({ revision }: { revision: number }) {
  const controls = useRef<any>(null)

  useEffect(() => {
    // The authored house is about 12m × 9m. Keep the building large and centered.
    requestAnimationFrame(() => {
      controls.current?.setLookAt(
        10.6, 9.0, 11.8, // camera
        0.0, 0.75, 0.0, // target
        true,
      )
    })
  }, [revision])

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={6}
      maxDistance={26}
      dollySpeed={0.55}
      truckSpeed={0.65}
      azimuthRotateSpeed={0.65}
      polarRotateSpeed={0.65}
    />
  )
}

export default function PascalWorkspace({ revision }: { revision: number }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let disposed = false

    void pluginReady.then(() => {
      if (disposed) return

      const snapshot = loadScene()
      applySceneSnapshot(snapshot as any, { origin: 'load' })

      // Presentation mode: no semantic overlays or drafting helpers in the center.
      const viewer = useViewer.getState()
      viewer.setRenderContext('viewer')
      viewer.setCameraMode('perspective')
      viewer.setWallMode('cutaway')
      viewer.setLevelMode('stacked')
      viewer.setShowZones(false)
      viewer.setShowGrid(false)
      viewer.setShowMeasurements(false)
      viewer.setShowGuides(false)
      viewer.setShowScans(false)
      viewer.setShading('rendered')
      viewer.setTextures(true)
      viewer.setShadows(true)
      viewer.setEdges('soft')

      setReady(true)
    })

    return () => {
      disposed = true
    }
  }, [revision])

  if (!ready) {
    return (
      <div className="pascal-loading">
        <span />
        正在加载住宅模型…
      </div>
    )
  }

  return (
    <div className="pascal-wrap pascal-viewer-only">
      <Viewer selectionManager="custom">
        <CameraRig revision={revision} />
        <ViewerExportBridge />
      </Viewer>
    </div>
  )
}
