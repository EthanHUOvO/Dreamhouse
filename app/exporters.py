from __future__ import annotations
import json
from io import BytesIO
from zipfile import ZIP_DEFLATED, ZipFile
from typing import Iterable

Box = dict[str, float | str]

def _triangle(normal, a, b, c):
    nx,ny,nz=normal
    return (f"  facet normal {nx:.6f} {ny:.6f} {nz:.6f}\n    outer loop\n"
            f"      vertex {a[0]:.6f} {a[1]:.6f} {a[2]:.6f}\n"
            f"      vertex {b[0]:.6f} {b[1]:.6f} {b[2]:.6f}\n"
            f"      vertex {c[0]:.6f} {c[1]:.6f} {c[2]:.6f}\n"
            "    endloop\n  endfacet\n")

def box_to_stl(box: Box, scale: float) -> str:
    x=float(box.get('x',0))*scale; z=float(box.get('z',0))*scale
    w=float(box.get('w',1))*scale; d=float(box.get('d',1))*scale; h=float(box.get('h',1))*scale
    y0=float(box.get('y',0))*scale; y1=y0+h
    x0,x1=x-w/2,x+w/2; z0,z1=z-d/2,z+d/2
    v={'000':(x0,y0,z0),'100':(x1,y0,z0),'110':(x1,y1,z0),'010':(x0,y1,z0),
       '001':(x0,y0,z1),'101':(x1,y0,z1),'111':(x1,y1,z1),'011':(x0,y1,z1)}
    faces=[((0,0,-1),('000','110','100'),('000','010','110')),((0,0,1),('001','101','111'),('001','111','011')),
           ((-1,0,0),('000','001','011'),('000','011','010')),((1,0,0),('100','110','111'),('100','111','101')),
           ((0,-1,0),('000','100','101'),('000','101','001')),((0,1,0),('010','011','111'),('010','111','110'))]
    out=[]
    for n,t1,t2 in faces:
        out.append(_triangle(n,v[t1[0]],v[t1[1]],v[t1[2]])); out.append(_triangle(n,v[t2[0]],v[t2[1]],v[t2[2]]))
    return ''.join(out)

def make_stl(name: str, boxes: Iterable[Box], scale: float) -> bytes:
    body=[f'solid {name}\n']
    for box in boxes: body.append(box_to_stl(box,scale))
    body.append(f'endsolid {name}\n')
    return ''.join(body).encode('ascii')

def _manufacturing_boxes(project):
    floor=dict(project['floor']); floor['y']=0
    base_y=float(floor.get('h',.2))
    walls=[dict(x,y=base_y) for x in project.get('walls',[])]
    furniture=[dict(x,y=base_y) for x in project.get('furniture',[])]
    return floor,walls,furniture

def build_stl_zip(project: dict) -> bytes:
    scale=float(project.get('metadata',{}).get('scale_mm_per_unit',50))
    floor,walls,furniture=_manufacturing_boxes(project)
    semantic={
      'project_id':project.get('id'),'preset_id':project.get('preset_id'),
      'scale_mm_per_unit':scale,'rooms':project.get('rooms',[]),'semantic_graph':project.get('semantic_graph',{}),
      'parts':{'floor':'01_floor.stl','walls':'02_walls.stl','furniture':'03_furniture.stl'}
    }
    buf=BytesIO()
    with ZipFile(buf,'w',ZIP_DEFLATED) as z:
        z.writestr('01_floor.stl',make_stl('floor',[floor],scale))
        z.writestr('02_walls.stl',make_stl('walls',walls,scale))
        z.writestr('03_furniture.stl',make_stl('furniture',furniture,scale))
        z.writestr('04_semantic_manifest.json',json.dumps(semantic,ensure_ascii=False,indent=2))
        z.writestr('README.txt',(
          'Smart Construction Semantic Pipeline - STL package\n'
          f"Project: {project.get('name','Untitled')}\nScale: 1 model unit = {scale:g} mm\n"
          '01_floor.stl: floor layer\n02_walls.stl: unified wall layer (multi-shell prototype)\n03_furniture.stl: furniture layer\n'
          '04_semantic_manifest.json: semantic room mapping for downstream tracking.\n\n'
          'Production note: before physical printing, perform Boolean union/manifold repair, tolerance checks and slicer validation.\n'))
    return buf.getvalue()

def _box_obj(name, box, vertex_offset, material):
    x=float(box.get('x',0)); z=float(box.get('z',0)); w=float(box.get('w',1)); d=float(box.get('d',1)); h=float(box.get('h',1)); y=float(box.get('y',0))
    x0,x1=x-w/2,x+w/2; z0,z1=z-d/2,z+d/2; y0,y1=y,y+h
    v=[(x0,y0,z0),(x1,y0,z0),(x1,y1,z0),(x0,y1,z0),(x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1)]
    faces=[(1,2,3,4),(5,8,7,6),(1,4,8,5),(2,6,7,3),(4,3,7,8),(1,5,6,2)]
    lines=[f'o {name}',f'usemtl {material}']+[f'v {a:.6f} {b:.6f} {c:.6f}' for a,b,c in v]
    for f in faces: lines.append('f '+' '.join(str(vertex_offset+i) for i in f))
    return '\n'.join(lines)+'\n', vertex_offset+8

def build_obj(project: dict) -> tuple[bytes,bytes]:
    floor,walls,furniture=_manufacturing_boxes(project)
    lines=['mtllib model.mtl','# meters, Y-up']
    offset=0
    s,offset=_box_obj('floor',floor,offset,'floor'); lines.append(s)
    for b in walls:
        s,offset=_box_obj(str(b.get('id','wall')),b,offset,'walls'); lines.append(s)
    for b in furniture:
        s,offset=_box_obj(str(b.get('id','furniture')),b,offset,'furniture'); lines.append(s)
    mtl='''newmtl floor\nKd 0.12 0.65 0.76\nnewmtl walls\nKd 0.46 0.37 0.82\nnewmtl furniture\nKd 0.85 0.55 0.18\n'''
    return '\n'.join(lines).encode('utf-8'), mtl.encode('utf-8')

def build_simulation_zip(project: dict) -> bytes:
    obj,mtl=build_obj(project)
    semantic={
      'schema':'smart-semantic-scene-v1','project_id':project.get('id'),'name':project.get('name'),
      'coordinate_system':'X-right, Y-up, Z-forward','units':'m','rooms':project.get('rooms',[]),
      'semantic_graph':project.get('semantic_graph',{}),'furniture':project.get('furniture',[]),
      'manufacturing_layers':project.get('manufacturing',{}).get('layers',[])
    }
    scene={
      'schema':'smart-simulation-scene-v1','mesh':'model.obj','semantic_sidecar':'semantic_scene.json',
      'entities':[
        *[{'id':r['id'],'kind':'room_semantic_region','semantic_type':r['semantic_type'],'center':[r['x'],0,r['z']],'size':[r['w'],0.02,r['d']]} for r in project.get('rooms',[])],
        *[{'id':f['id'],'kind':'furniture','semantic_type':f.get('semantic_type'),'room_id':f.get('room_id'),'center':[f['x'],float(project['floor'].get('h',.22)),f['z']],'size':[f['w'],f['h'],f['d']]} for f in project.get('furniture',[])]
      ]
    }
    sdf=f'''<?xml version="1.0"?>\n<sdf version="1.9">\n  <model name="{project.get('preset_id','semantic_house')}">\n    <static>true</static>\n    <link name="house_mesh">\n      <visual name="visual"><geometry><mesh><uri>model.obj</uri></mesh></geometry></visual>\n      <collision name="collision"><geometry><mesh><uri>model.obj</uri></mesh></geometry></collision>\n    </link>\n  </model>\n</sdf>\n'''
    manifest={'project_id':project.get('id'),'artifacts':{'mesh':'model.obj','material':'model.mtl','semantics':'semantic_scene.json','generic_scene':'simulation_scene.json','gazebo_sdf':'model.sdf'},'units':'m'}
    buf=BytesIO()
    with ZipFile(buf,'w',ZIP_DEFLATED) as z:
        z.writestr('model.obj',obj); z.writestr('model.mtl',mtl)
        z.writestr('semantic_scene.json',json.dumps(semantic,ensure_ascii=False,indent=2))
        z.writestr('simulation_scene.json',json.dumps(scene,ensure_ascii=False,indent=2))
        z.writestr('model.sdf',sdf)
        z.writestr('manifest.json',json.dumps(manifest,ensure_ascii=False,indent=2))
        z.writestr('README_SIMULATION.md',f'''# Simulation bundle\n\nProject: {project.get('name')}\n\n- `model.obj` / `model.mtl`: generic 3D mesh in meters.\n- `semantic_scene.json`: semantic room and furniture data.\n- `simulation_scene.json`: generic entity scene description.\n- `model.sdf`: basic Gazebo-compatible model wrapper.\n\nUnity / Isaac Sim can import `model.obj`; preserve `semantic_scene.json` as a sidecar and map room IDs into engine-side tags/components.\n''')
    return buf.getvalue()
