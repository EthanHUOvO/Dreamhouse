'use client'
import type { DrawingImportRecord } from '@/lib/types'
import styles from './DrawingSourceBar.module.css'

export default function DrawingSourceBar({drawing,onReimport,disabled}:{drawing:DrawingImportRecord;onReimport:()=>void;disabled?:boolean}){
  const d=drawing.detected
  return <div className={styles.bar}>
    <div className={styles.icon}>▧</div>
    <div className={styles.info}>
      <b>{drawing.fileName}</b>
      <span>{drawing.source==='sample'?'示例图纸':'用户导入'} · {drawing.templateId} · {d.rooms} 空间 / {d.walls} 墙体 / {d.doors} 门 / {d.windows} 窗</span>
    </div>
    <div className={styles.badge}>已解析</div>
    <button onClick={onReimport} disabled={disabled}>重新导入图纸</button>
  </div>
}
