import json,sys,zipfile
from io import BytesIO
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'app'))
from exporters import build_stl_zip,build_simulation_zip

for name in ('two_bedroom','three_bedroom','four_bedroom'):
    p=json.loads((ROOT/'app'/'data'/'presets'/f'{name}.json').read_text(encoding='utf-8'))
    assert p['rooms'] and all('semantic_type' in r for r in p['rooms'])
    assert p['metadata'].get('reference',{}).get('url'), f'{name}: missing web reference'
    fw,fd=p['floor']['w'],p['floor']['d']
    assert abs(fw*fd-float(p['metadata']['area']))/float(p['metadata']['area']) < .04
    for r in p['rooms']:
        assert abs(r['x'])+r['w']/2 <= fw/2+1e-6, (name,r['id'],'x out of floor')
        assert abs(r['z'])+r['d']/2 <= fd/2+1e-6, (name,r['id'],'z out of floor')
    for i,a in enumerate(p['rooms']):
        ax0,ax1=a['x']-a['w']/2,a['x']+a['w']/2;az0,az1=a['z']-a['d']/2,a['z']+a['d']/2
        for b in p['rooms'][i+1:]:
            bx0,bx1=b['x']-b['w']/2,b['x']+b['w']/2;bz0,bz1=b['z']-b['d']/2,b['z']+b['d']/2
            overlap=max(0,min(ax1,bx1)-max(ax0,bx0))*max(0,min(az1,bz1)-max(az0,bz0))
            assert overlap < .03, (name,a['id'],b['id'],overlap)
    z=zipfile.ZipFile(BytesIO(build_stl_zip(p)))
    assert {'01_floor.stl','02_walls.stl','03_furniture.stl','04_semantic_manifest.json'}<=set(z.namelist())
    s=zipfile.ZipFile(BytesIO(build_simulation_zip(p)))
    assert {'model.obj','model.sdf','semantic_scene.json','simulation_scene.json'}<=set(s.namelist())
print('smoke_test: OK')
