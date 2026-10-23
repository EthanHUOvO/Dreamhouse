import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BeforeAfterComparison} from '../../app-src/components/customer/BeforeAfterComparison';

function Preview(){
 const [portrait,setPortrait]=useState(false),[zoom,setZoom]=useState(false);
 const before=portrait?'/portrait-source.png':'/source.png';
 const after=portrait?'/portrait-legacy.png':'/legacy-stretched.png';
 return <main style={{padding:24,fontFamily:'sans-serif'}}>
  <h2>拍照画幅对齐验证</h2>
  <p>同一图片的不同分辨率对照，不是 AI 生成结果。</p>
  <nav style={{display:'flex',gap:12,marginBottom:16}}>
   <button onClick={()=>setPortrait(false)}>横屏标记图</button>
   <button onClick={()=>setPortrait(true)}>竖屏标记图</button>
   <button onClick={()=>setZoom(v=>!v)}>切换放大</button>
  </nav>
  <div style={{width:portrait?480:'100%',height:portrait?640:560,overflow:'hidden',background:'#ddd'}}>
   <div style={{height:'100%',transform:zoom?'scale(1.25)':'none'}}>
    <BeforeAfterComparison beforeImage={before} afterImage={after} beforeLabel="原拍摄画幅" afterLabel="不同分辨率 · 同一画幅"/>
   </div>
  </div>
 </main>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
