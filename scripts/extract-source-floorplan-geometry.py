"""Create a source-first geometry manifest from the 24 reference PNGs.

This manifest intentionally separates image evidence from rebuilt specs. It only
records connected plan envelope evidence; local walls/openings remain editable
in the calibration editor until visual confidence is sufficient.
"""
import json
from collections import deque
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "lib/floorplans/source-floorplan-geometry.json"
KNOWN = {"one-option-01": (6.63, 8.379), "three-option-05": (10.5, 12.999)}

def envelope(image):
    rgb = image.convert("RGB"); w, h = rgb.size; px = rgb.load(); mask = set()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]; lum = (r + g + b) / 3
            if lum < 210 and max(r, g, b) - min(r, g, b) < 48: mask.add((x, y))
    seen = set(); best = []
    for seed in list(mask):
        if seed in seen: continue
        q = deque([seed]); seen.add(seed); component = []
        while q:
            point = q.pop(); component.append(point); x, y = point
            for candidate in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if candidate in mask and candidate not in seen: seen.add(candidate); q.append(candidate)
        if len(component) > len(best): best = component
    if not best: return None
    xs = [p[0] for p in best]; ys = [p[1] for p in best]
    return {"left": min(xs), "top": min(ys), "right": max(xs), "bottom": max(ys), "pixels": len(best)}

catalog = json.loads((ROOT / "lib/floorplans/rebuilt-variant-specs.json").read_text(encoding="utf-8"))
rows = []
for entry in catalog["entries"]:
    variant = entry["variantId"]; path = ROOT / "public" / entry["imageUrl"].lstrip("/"); image = Image.open(path); box = envelope(image)
    if not box:
        rows.append({"id": variant, "sourceImage": entry["imageUrl"], "confidence": "low", "needsManualReview": True}); continue
    width = box["right"] - box["left"]; depth = box["bottom"] - box["top"]
    known = KNOWN.get(variant)
    scale = {"widthM": known[0], "depthM": known[1], "pixelToMeterX": known[0] / width, "pixelToMeterY": known[1] / depth} if known else None
    rows.append({"id": variant, "sourceImage": entry["imageUrl"], "imageSize": {"width": image.width, "height": image.height}, "boundsPx": box, "sourceOuterPolygonPx": [[box["left"], box["top"]], [box["right"], box["top"]], [box["right"], box["bottom"]], [box["left"], box["bottom"]]], "scale": scale, "walls": [], "openings": [], "rooms": [], "annotations": [], "confidence": "medium" if known else "low", "needsManualReview": not bool(known), "notes": "Local walls, openings and room labels require calibration-editor or vision review; envelope alone is not a structural reconstruction."})
OUT.write_text(json.dumps({"schema": "dreamhouse-source-floorplan-geometry/v1", "count": len(rows), "entries": rows}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"count": len(rows), "output": str(OUT), "highConfidence": sum(1 for row in rows if row.get("confidence") == "high")}, ensure_ascii=False))
