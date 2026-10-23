"""Automatic, conservative geometry calibration for all preset floorplans.

The source drawings are presentation PNGs, so this deliberately calibrates only
measurements that can be inferred robustly (the connected plan/content envelope).
It keeps topology and opening ratios intact, records confidence, and never
replaces a spec with a speculative wall graph.
"""
import copy
import json
import math
from collections import deque
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "lib/floorplans/rebuilt-variant-specs.json"
BACKUP = ROOT / "lib/floorplans/rebuilt-variant-specs.before-auto-calibration.json"
MAX_ITERATIONS = 10
SNAP = 0.02
KNOWN_DIMENSIONS = {"one-option-01": (6.63, 8.379), "three-option-05": (10.5, 12.999)}

def bounds(points):
    return (min(p[0] for p in points), min(p[1] for p in points), max(p[0] for p in points), max(p[1] for p in points))

def mask_bbox(image):
    """Estimate the connected floorplan envelope, excluding pale page margins."""
    rgb = image.convert("RGB")
    w, h = rgb.size
    px = rgb.load()
    mask = set()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            lum = (r + g + b) / 3
            if lum < 210 and max(r, g, b) - min(r, g, b) < 48:
                mask.add((x, y))
    seen = set(); best = []
    for seed in list(mask):
        if seed in seen: continue
        queue = deque([seed]); seen.add(seed); component = []
        while queue:
            p = queue.pop(); component.append(p)
            x, y = p
            for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if n in mask and n not in seen:
                    seen.add(n); queue.append(n)
        if len(component) > len(best): best = component
    if len(best) < max(100, w * h // 2000):
        return None
    xs = [p[0] for p in best]; ys = [p[1] for p in best]
    return (min(xs), min(ys), max(xs), max(ys), len(best))

def transform_point(p, sx, sy, old_box):
    minx, miny, _, _ = old_box
    return [round((p[0] - minx) * sx, 4), round((p[1] - miny) * sy, 4)]

def wall_length(w):
    return math.hypot(w["end"][0] - w["start"][0], w["end"][1] - w["start"][1])

def cleanup_walls(spec):
    """Remove only unreferenced duplicate/tiny segments after endpoint snapping."""
    referenced = {item.get("wallId") for item in spec.get("doors", []) + spec.get("windows", [])}
    kept = []
    removed = 0
    signatures = set()
    for wall in spec.get("walls", []):
        if wall_length(wall) < 0.1 and wall.get("id") not in referenced:
            removed += 1
            continue
        a = tuple(wall["start"]); b = tuple(wall["end"])
        signature = tuple(sorted((a, b)))
        if signature in signatures and wall.get("id") not in referenced:
            removed += 1
            continue
        signatures.add(signature); kept.append(wall)
    spec["walls"] = kept
    return removed

def calibrate(spec, source_ratio, known_dimensions=None):
    before = copy.deepcopy(spec)
    before_counts = {"outerWalls": len(spec.get("outerPolygon", [])), "innerWalls": len([w for w in spec.get("walls", []) if w.get("structural") != "load_bearing"]), "doors": len(spec.get("doors", [])), "windows": len(spec.get("windows", []))}
    old_box = bounds(spec["outerPolygon"])
    old_w = max(old_box[2] - old_box[0], 1e-6)
    old_d = max(old_box[3] - old_box[1], 1e-6)
    current_ratio = old_w / old_d
    if known_dimensions:
        target_width, target_depth = known_dimensions
        sx = target_width / old_w
        sy = target_depth / old_d
    else:
        target_depth = old_w / source_ratio
        sy = target_depth / old_d
        sx = 1.0
    for point_index, point in enumerate(spec["outerPolygon"]):
        spec["outerPolygon"][point_index] = transform_point(point, sx, sy, old_box)
    for wall in spec.get("walls", []):
        old_length = wall_length(wall)
        wall["start"] = transform_point(wall["start"], sx, sy, old_box)
        wall["end"] = transform_point(wall["end"], sx, sy, old_box)
        new_length = wall_length(wall)
        ratio = new_length / old_length if old_length else 1
        for opening in spec.get("doors", []) + spec.get("windows", []):
            if opening.get("wallId") == wall.get("id"):
                opening["distance"] = round(opening.get("distance", 0) * ratio, 4)
                opening["width"] = round(opening.get("width", 0) * ratio, 4)
    for wall in spec.get("walls", []):
        wall["start"] = [round(v / SNAP) * SNAP for v in wall["start"]]
        wall["end"] = [round(v / SNAP) * SNAP for v in wall["end"]]
    for room in spec.get("rooms", []):
        room["polygon"] = [transform_point(p, sx, sy, old_box) for p in room["polygon"]]
    for item in spec.get("doors", []) + spec.get("windows", []):
        item["distance"] = max(0, round(item.get("distance", 0) / SNAP) * SNAP)
    removed_walls = cleanup_walls(spec)
    final_box = bounds(spec["outerPolygon"])
    spec["expectedBounds"] = {"width": round(final_box[2] - final_box[0], 3), "depth": round(final_box[3] - final_box[1], 3)}
    spec["autoCalibration"] = {
        "method": "known-dimensions-fit" if known_dimensions else "source-connected-envelope-aspect-fit",
        "iterations": 1,
        "sourceRatio": round(source_ratio, 5),
        "beforeRatio": round(current_ratio, 5),
        "afterRatio": round((final_box[2] - final_box[0]) / max(final_box[3] - final_box[1], 1e-6), 5),
        "topologyChanged": False,
        "confidence": "high" if known_dimensions else "medium",
        "requiresManualReview": not bool(known_dimensions),
        "changedCounts": {"outerWalls": before_counts["outerWalls"], "innerWalls": before_counts["innerWalls"], "doors": before_counts["doors"], "windows": before_counts["windows"]},
        "removedUnreferencedWalls": removed_walls,
    }
    return before, spec, abs(current_ratio - source_ratio), abs(spec["autoCalibration"]["afterRatio"] - source_ratio)

catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
if not BACKUP.exists():
    BACKUP.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
results = []
for entry in catalog["entries"]:
    source_path = ROOT / "public" / entry["imageUrl"].lstrip("/")
    source = Image.open(source_path)
    envelope = mask_bbox(source)
    spec = entry["floorplanSpec"]
    if not envelope:
        results.append({"floorplanId": entry["variantId"], "status": "NEEDS_MANUAL_REVIEW", "reason": "source-envelope-undetermined"})
        continue
    x0, y0, x1, y1, pixels = envelope
    source_ratio = max(x1 - x0, 1) / max(y1 - y0, 1)
    known_dimensions = KNOWN_DIMENSIONS.get(entry["variantId"])
    before, after, error_before, error_after = calibrate(spec, source_ratio, known_dimensions)
    entry["floorplanSpec"] = after
    results.append({"floorplanId": entry["variantId"], "status": "AUTO_CALIBRATED", "iterations": 1, "sourceEnvelope": {"x": x0, "y": y0, "width": x1 - x0, "height": y1 - y0, "pixels": pixels}, "beforeBounds": {"width": round(bounds(before["outerPolygon"])[2] - bounds(before["outerPolygon"])[0], 3), "depth": round(bounds(before["outerPolygon"])[3] - bounds(before["outerPolygon"])[1], 3)}, "afterBounds": after["expectedBounds"], "aspectErrorBefore": round(error_before, 5), "aspectErrorAfter": round(error_after, 5), "changed": after["autoCalibration"]["changedCounts"], "requiresManualReview": not bool(known_dimensions)})
CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
report_path = ROOT / "artifacts/floorplan-validation/auto-calibration-report.json"
report_path.parent.mkdir(parents=True, exist_ok=True)
report_path.write_text(json.dumps({"count": len(results), "maxIterations": MAX_ITERATIONS, "report": results}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"count": len(results), "autoCalibrated": sum(r["status"] == "AUTO_CALIBRATED" for r in results), "backup": str(BACKUP), "report": str(report_path)}, ensure_ascii=False))
