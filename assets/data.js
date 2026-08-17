(function(global){
  const KEY='dreamhouse.stable.v2.orders';
  const deep=x=>JSON.parse(JSON.stringify(x));

  function baseDesign(){
    return {
      scenario:'single',
      rooms:[
        {id:'living',name:'客餐厨一体',x:-6,z:-4.5,w:7.5,d:4.5,color:'#d5e1e5'},
        {id:'study',name:'书房',x:1.5,z:-4.5,w:4.5,d:4.5,color:'#d7e2d9'},
        {id:'corridor',name:'走廊',x:-6,z:0,w:12,d:1.2,color:'#e4dfd4'},
        {id:'master',name:'主卧',x:-6,z:1.2,w:4.2,d:3.3,color:'#d9dfe7'},
        {id:'bath',name:'卫生间',x:-1.8,z:1.2,w:3,d:3.3,color:'#d9e4e3'},
        {id:'gaming',name:'电竞房',x:1.2,z:1.2,w:4.8,d:3.3,color:'#e1d9e7'}
      ],
      walls:[
        {id:'n',a:[-6,-4.5],b:[6,-4.5],load:true},{id:'e',a:[6,-4.5],b:[6,4.5],load:true},{id:'s',a:[-6,4.5],b:[6,4.5],load:true},{id:'w',a:[-6,-4.5],b:[-6,4.5],load:true},
        /* 客餐厨一体到走廊之间的墙已删除，只保留书房侧墙段 */
        {id:'northBand',a:[1.5,0],b:[6,0],load:false},
        {id:'southBand',a:[-6,1.2],b:[6,1.2],load:false},{id:'northV',a:[1.5,-4.5],b:[1.5,0],load:false},{id:'southV1',a:[-1.8,1.2],b:[-1.8,4.5],load:false},{id:'southV2',a:[1.2,1.2],b:[1.2,4.5],load:false}
      ],
      doors:[{x:6,z:.6},{x:4.05,z:0},{x:-3.8,z:1.2},{x:.45,z:1.2},{x:3.6,z:1.2}],
      windows:[{x:-4.1,z:-4.5},{x:-1.3,z:-4.5},{x:3.8,z:-4.5},{x:-3.9,z:4.5},{x:0,z:4.5},{x:3.8,z:4.5},{x:-6,z:-2.3},{x:-6,z:2.7},{x:6,z:-2.5},{x:6,z:2.8}],
      furniture:[
        {id:'masterBed',room:'master',name:'主卧床',kind:'bed',x:-4.05,z:3.5,w:2.5,d:2,rot:90,color:'#eee8df'},
        {id:'masterCloset',room:'master',name:'主卧衣柜',kind:'closet',x:-5.35,z:2.25,w:1.65,d:.65,rot:0,color:'#e8e8e6'},
        {id:'masterSide',room:'master',name:'床头柜',kind:'side',x:-5.3,z:4.05,w:.55,d:.55,rot:0,color:'#b58c62'},
        {id:'sofa',room:'living',name:'沙发',kind:'sofa',x:-4.75,z:-1.55,w:2.3,d:1,rot:90,color:'#d5c4af'},
        {id:'coffee',room:'living',name:'茶几',kind:'table',x:-3.0,z:-1.8,w:1.6,d:.75,rot:0,color:'#7e5239'},
        {id:'dining',room:'living',name:'餐桌',kind:'table',x:-3.9,z:-3.55,w:2.0,d:.85,rot:0,color:'#b88750'},
        {id:'kitchen',room:'living',name:'厨房柜台',kind:'counter',x:.25,z:-3.75,w:2.2,d:.75,rot:0,color:'#e7e7e5'},
        {id:'fridge',room:'living',name:'冰箱',kind:'closet',x:1.0,z:-3.65,w:.8,d:.8,rot:0,color:'#ddd'},
        {id:'studyTable',room:'study',name:'书桌',kind:'table',x:3.5,z:-3.1,w:1.8,d:.75,rot:0,color:'#aa7a50'},
        {id:'studyChair',room:'study',name:'书房椅',kind:'chair',x:3.5,z:-2.35,w:.55,d:.55,rot:0,color:'#8d755e'},
        {id:'gamingTable',room:'gaming',name:'电竞桌',kind:'table',x:3.7,z:3.7,w:1.8,d:.75,rot:0,color:'#8a6449'},
        {id:'gamingChair',room:'gaming',name:'电竞椅',kind:'chair',x:3.7,z:2.9,w:.65,d:.65,rot:0,color:'#5d6468'},
        {id:'bathToilet',room:'bath',name:'马桶',kind:'toilet',x:-.65,z:2.15,w:.7,d:.9,rot:90,color:'#f2f2ef'},
        {id:'bathSink',room:'bath',name:'洗手台',kind:'sink',x:.35,z:3.8,w:1.05,d:.65,rot:0,color:'#eceae4'},
        /* 淋浴房固定在卫生间左下角，贴两面墙形成角部围合 */
        {id:'bathShower',room:'bath',name:'淋浴房',kind:'shower',x:-1.28,z:3.88,w:.9,d:.9,rot:0,color:'#91c3ce'}
      ]
    };
  }

  function scheme(type){
    const s=baseDesign();s.scenario=type;
    const room=(id)=>s.rooms.find(r=>r.id===id);
    const removeRoomFurniture=(id)=>{s.furniture=s.furniture.filter(f=>f.room!==id)};
    if(type==='couple'){
      room('gaming').name='衣帽间';room('gaming').color='#e3d8d0';removeRoomFurniture('gaming');
      s.furniture.push({id:'dress1',room:'gaming',name:'衣柜A',kind:'closet',x:5.15,z:2.15,w:1.45,d:.65,rot:90,color:'#e4e2dc'},{id:'dress2',room:'gaming',name:'衣柜B',kind:'closet',x:5.15,z:3.75,w:1.45,d:.65,rot:90,color:'#e4e2dc'},{id:'dresser',room:'gaming',name:'斗柜',kind:'counter',x:2.25,z:3.8,w:1.3,d:.6,rot:0,color:'#c2a88c'});
      room('study').name='双人书房';removeRoomFurniture('study');s.furniture.push({id:'desk1',room:'study',name:'书桌A',kind:'table',x:2.7,z:-3.3,w:1.45,d:.7,rot:0,color:'#aa7a50'},{id:'desk2',room:'study',name:'书桌B',kind:'table',x:4.8,z:-3.3,w:1.45,d:.7,rot:0,color:'#aa7a50'},{id:'chair1',room:'study',name:'椅子A',kind:'chair',x:2.7,z:-2.5,w:.55,d:.55,rot:0,color:'#796757'},{id:'chair2',room:'study',name:'椅子B',kind:'chair',x:4.8,z:-2.5,w:.55,d:.55,rot:0,color:'#796757'});
    }
    if(type==='child'||type==='nanny'){
      room('gaming').name='儿童房';room('gaming').color='#d6e4df';removeRoomFurniture('gaming');
      s.furniture.push({id:'childBed',room:'gaming',name:'儿童床',kind:'bed',x:2.35,z:3.2,w:2,d:1.5,rot:90,color:'#eee8df'},{id:'childDesk',room:'gaming',name:'儿童书桌',kind:'table',x:4.6,z:2.05,w:1.3,d:.65,rot:0,color:'#b88c58'},{id:'childCloset',room:'gaming',name:'儿童衣柜',kind:'closet',x:5.15,z:3.7,w:1.3,d:.6,rot:90,color:'#e5e2dd'});
      // 浴室拆分为主卫+公卫
      s.rooms=s.rooms.filter(r=>r.id!=='bath');s.rooms.push({id:'mbath',name:'主卫',x:-1.8,z:1.2,w:1.5,d:3.3,color:'#d5e4e8'},{id:'pbath',name:'公卫',x:-.3,z:1.2,w:1.5,d:3.3,color:'#d8e7e1'});s.walls.push({id:'bathSplit',a:[-.3,1.2],b:[-.3,4.5],load:false});s.furniture=s.furniture.filter(f=>f.room!=='bath');s.furniture.push({id:'mshower',room:'mbath',name:'主卫淋浴房',kind:'shower',x:-1.30,z:3.85,w:.75,d:.75,rot:0,color:'#91c3ce'},{id:'mtoilet',room:'mbath',name:'主卫马桶',kind:'toilet',x:-.85,z:2.05,w:.6,d:.75,rot:90,color:'#f2f2ef'},{id:'msink',room:'mbath',name:'主卫洗手台',kind:'sink',x:-.85,z:3.0,w:.65,d:.5,rot:0,color:'#eceae4'},{id:'ptoilet',room:'pbath',name:'公卫马桶',kind:'toilet',x:.55,z:3.5,w:.6,d:.75,rot:0,color:'#f2f2ef'},{id:'psink',room:'pbath',name:'公卫洗手台',kind:'sink',x:.45,z:2.05,w:.65,d:.5,rot:0,color:'#eceae4'});
      if(type==='nanny'){room('study').name='保姆房';removeRoomFurniture('study');s.furniture.push({id:'nannyBed',room:'study',name:'保姆床',kind:'bed',x:2.5,z:-2.7,w:2,d:1.5,rot:90,color:'#eee8df'},{id:'nannyCloset',room:'study',name:'保姆衣柜',kind:'closet',x:5.1,z:-3.6,w:1.3,d:.6,rot:90,color:'#e4e2dd'});}
    }
    if(type==='replan'){
      s.rooms=s.rooms.filter(r=>r.id!=='gaming');s.rooms.push({id:'newStudy',name:'书房',x:1.2,z:1.2,w:2.4,d:3.3,color:'#d7e2d9'},{id:'storage',name:'储物间',x:3.6,z:1.2,w:2.4,d:3.3,color:'#e7e1d7'});s.walls.push({id:'replanSplit',a:[3.6,1.2],b:[3.6,4.5],load:false});s.furniture=s.furniture.filter(f=>f.room!=='gaming');s.furniture.push({id:'newDesk',room:'newStudy',name:'新书房桌',kind:'table',x:2.35,z:3.3,w:1.3,d:.65,rot:0,color:'#aa7a50'},{id:'storage1',room:'storage',name:'储物柜A',kind:'closet',x:5.05,z:2.2,w:1.2,d:.6,rot:90,color:'#dedbd5'},{id:'storage2',room:'storage',name:'储物柜B',kind:'closet',x:5.05,z:3.75,w:1.2,d:.6,rot:90,color:'#dedbd5'});room('study').name='儿童房';removeRoomFurniture('study');s.furniture.push({id:'reChildBed',room:'study',name:'儿童床',kind:'bed',x:2.45,z:-2.9,w:2,d:1.5,rot:90,color:'#eee8df'},{id:'reChildDesk',room:'study',name:'儿童书桌',kind:'table',x:4.9,z:-3.1,w:1.3,d:.65,rot:90,color:'#b88c58'});
    }
    return s;
  }

  function newOrder(id,customer,status,scenario){
    const d=scheme(scenario);return {id,customer,project:'住宅空间改造',status,approvedVersion:1,draft:null,design:{version:1,scenario,scene:d},change:null,production:status==='production'?58:100,construction:status==='construction'?72:status==='completed'?100:0,accepted:status==='completed',printer:{progress:status==='production'?48:100,status:status==='production'?'运行中':'完成'},robot:{progress:status==='construction'?66:status==='completed'?100:0,status:status==='construction'?'运行中':status==='completed'?'完成':'待机'}};
  }
  function defaults(){return [newOrder('DH-2026-001','王先生','construction','child'),newOrder('DH-2026-002','李女士','production','couple'),newOrder('DH-2026-003','张女士','construction','nanny'),newOrder('DH-2026-004','赵先生','completed','single')];}
  function load(){try{const x=localStorage.getItem(KEY);if(x)return JSON.parse(x)}catch(e){}const x=defaults();save(x);return x}
  function save(x){localStorage.setItem(KEY,JSON.stringify(x))}
  function reset(){localStorage.removeItem(KEY)}
  global.DreamData={KEY,deep,scheme,defaults,load,save,reset};
})(window);
