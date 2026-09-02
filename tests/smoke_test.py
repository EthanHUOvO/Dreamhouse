import json,sys,zipfile
from io import BytesIO
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'app'))
from exporters import build_stl_zip,build_simulation_zip
for name in ('two_bedroom','three_bedroom','four_bedroom'):
 p=json.loads((ROOT/'app'/'data'/'presets'/f'{name}.json').read_text(encoding='utf-8'))
 assert p['rooms'] and all('semantic_type' in r for r in p['rooms'])
 z=zipfile.ZipFile(BytesIO(build_stl_zip(p))); assert {'01_floor.stl','02_walls.stl','03_furniture.stl','04_semantic_manifest.json'}<=set(z.namelist())
 s=zipfile.ZipFile(BytesIO(build_simulation_zip(p))); assert {'model.obj','model.sdf','semantic_scene.json','simulation_scene.json'}<=set(s.namelist())
print('smoke_test: OK')
