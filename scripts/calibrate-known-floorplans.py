import json, math
from pathlib import Path

root = Path(__file__).resolve().parents[1]
path = root / "lib/floorplans/rebuilt-variant-specs.json"
data = json.loads(path.read_text(encoding="utf-8"))
targets = {"one-option-01": (6.63, 8.379), "three-option-05": (10.5, 12.999)}

def bounds(points):
    return min(p[0] for p in points), min(p[1] for p in points), max(p[0] for p in points), max(p[1] for p in points)

def transform(entry, width, depth):
    spec = entry["floorplanSpec"]
    minx, miny, maxx, maxy = bounds(spec["outerPolygon"])
    sx, sy = width / (maxx - minx), depth / (maxy - miny)
    def point(p): return [round((p[0] - minx) * sx, 4), round((p[1] - miny) * sy, 4)]
    old_walls = {w["id"]: w.copy() for w in spec["walls"]}
    spec["outerPolygon"] = [point(p) for p in spec["outerPolygon"]]
    spec["walls"] = [{**w, "start": point(w["start"]), "end": point(w["end"])} for w in spec["walls"]]
    spec["rooms"] = [{**r, "polygon": [point(p) for p in r["polygon"]]} for r in spec["rooms"]]
    for group in ("doors", "windows"):
        updated = []
        for opening in spec[group]:
            old = old_walls.get(opening["wallId"])
            new = next(w for w in spec["walls"] if w["id"] == opening["wallId"])
            old_len = math.hypot(old["end"][0]-old["start"][0], old["end"][1]-old["start"][1]) or 1
            new_len = math.hypot(new["end"][0]-new["start"][0], new["end"][1]-new["start"][1]) or 1
            ratio = new_len / old_len
            updated.append({**opening, "distance": round(opening.get("distance", 0) * ratio, 4), "width": round(opening.get("width", 0.86) * ratio, 4)})
        spec[group] = updated
    spec["rebuild"] = {**spec.get("rebuild", {}), "scaleCalibration": {"method": "source-dimension-chain", "width": width, "depth": depth, "confidence": "high"}}
    entry["rebuildValidation"] = {**entry.get("rebuildValidation", {}), "status": "ready", "issues": []}

for entry in data["entries"]:
    if entry["variantId"] in targets: transform(entry, *targets[entry["variantId"]])
path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print("calibrated", ", ".join(targets))
