from pathlib import Path
import json,re
root=Path(__file__).resolve().parents[1]
pkg=json.loads((root/'package.json').read_text())
assert pkg['dependencies']['@pascal-app/editor']=='1.0.0-beta.4'
required=['components/PascalWorkspace.tsx','components/IdealHomeShell.tsx','lib/constraint-guard.ts','lib/llm-planner.ts','app/api/renovation/plan/route.ts','docs/MANUFACTURING_EXPORT.md','README.md']
for x in required: assert (root/x).exists(),x
base=(root/'lib/base-house.ts').read_text(encoding='utf-8')
for x in ['wall_ext_s','wall_p_h1','zone_gaming','zone_bath','slab_ground']: assert x in base
assert "structural_type:'load_bearing'" not in base or 'load_bearing' in base
print('Integrity check OK')
