import json
import math
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "lib/floorplans/rebuilt-variant-specs.json"
OUT = ROOT / "artifacts/floorplan-validation"
OUT.mkdir(parents=True, exist_ok=True)
catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
backup_catalog = json.loads((ROOT / "lib/floorplans/rebuilt-variant-specs.before-auto-calibration.json").read_text(encoding="utf-8")) if (ROOT / "lib/floorplans/rebuilt-variant-specs.before-auto-calibration.json").exists() else None
backup_specs = {entry["variantId"]: entry["floorplanSpec"] for entry in (backup_catalog or {}).get("entries", [])}

KNOWN = {
    "one-option-01": (6.63, 8.379),
    "three-option-05": (10.5, 12.999),
}

def polygon_area(points):
    return abs(sum(points[i][0] * points[(i + 1) % len(points)][1] - points[(i + 1) % len(points)][0] * points[i][1] for i in range(len(points))) / 2)

def bounds(points):
    return min(p[0] for p in points), min(p[1] for p in points), max(p[0] for p in points), max(p[1] for p in points)

def content_bbox(image):
    """Find the drawable plan area without treating white page margins as geometry."""
    rgb = image.convert("RGB")
    pixels = rgb.load()
    xs, ys = [], []
    for y in range(rgb.height):
        for x in range(rgb.width):
            r, g, b = pixels[x, y]
            if min(r, g, b) < 238 or max(r, g, b) - min(r, g, b) > 12:
                xs.append(x); ys.append(y)
    if not xs:
        return (0, 0, image.width, image.height)
    pad = 8
    return (max(0, min(xs) - pad), max(0, min(ys) - pad), min(image.width, max(xs) + pad + 1), min(image.height, max(ys) + pad + 1))

def make_mapper(box, target_box, size):
    minx, miny, maxx, maxy = box
    tx0, ty0, tx1, ty1 = target_box
    sx = (tx1 - tx0) / max(maxx - minx, 1e-6)
    sy = (ty1 - ty0) / max(maxy - miny, 1e-6)
    scale = min(sx, sy)
    ox = tx0 + ((tx1 - tx0) - (maxx - minx) * scale) / 2
    oy = ty0 + ((ty1 - ty0) - (maxy - miny) * scale) / 2
    return lambda p: (ox + (p[0] - minx) * scale, oy + (p[1] - miny) * scale)

def line(draw, a, b, mapper, color, width=4):
    draw.line([mapper(a), mapper(b)], fill=color, width=width)

def draw_projection(spec, size=(640, 500), target_box=None, transparent=False):
    image = Image.new("RGBA", size, (255, 255, 255, 0) if transparent else (248, 250, 249, 255))
    draw = ImageDraw.Draw(image)
    box = bounds(spec["outerPolygon"])
    mapper = make_mapper(box, target_box or (70, 55, size[0] - 70, size[1] - 55), size)
    points = []
    for p in spec["outerPolygon"]:
        points.append(mapper(p))
    draw.polygon(points, fill=(238, 244, 242, 150 if transparent else 255), outline=(22, 63, 76, 255), width=6)
    for wall in spec["walls"]:
        line(draw, wall["start"], wall["end"], mapper, (17, 57, 68, 230) if wall.get("structural") == "load_bearing" else (79, 119, 130, 220), 7 if wall.get("structural") == "load_bearing" else 4)
    for opening in spec.get("doors", []):
        wall = next((w for w in spec["walls"] if w["id"] == opening["wallId"]), None)
        if not wall: continue
        dx, dy = wall["end"][0] - wall["start"][0], wall["end"][1] - wall["start"][1]
        length = math.hypot(dx, dy) or 1
        a = opening.get("distance", 0)
        b = a + opening.get("width", 0.86)
        line(draw, (wall["start"][0] + dx / length * a, wall["start"][1] + dy / length * a), (wall["start"][0] + dx / length * b, wall["start"][1] + dy / length * b), mapper, (220, 106, 35, 255), 8)
    for opening in spec.get("windows", []):
        wall = next((w for w in spec["walls"] if w["id"] == opening["wallId"]), None)
        if not wall: continue
        dx, dy = wall["end"][0] - wall["start"][0], wall["end"][1] - wall["start"][1]
        length = math.hypot(dx, dy) or 1
        a = opening.get("distance", 0)
        b = a + opening.get("width", 1.2)
        line(draw, (wall["start"][0] + dx / length * a, wall["start"][1] + dy / length * a), (wall["start"][0] + dx / length * b, wall["start"][1] + dy / length * b), mapper, (42, 123, 180, 255), 8)
    return image

def occupancy(image):
    rgb = image.convert("RGB")
    mask = Image.new("1", rgb.size, 0)
    src = rgb.load(); dst = mask.load()
    for y in range(rgb.height):
        for x in range(rgb.width):
            r, g, b = src[x, y]
            dst[x, y] = min(r, g, b) < 220 or max(r, g, b) - min(r, g, b) > 22
    return mask

def overlap_percent(source_image, projection_image):
    a, b = occupancy(source_image), occupancy(projection_image)
    ap, bp = a.load(), b.load()
    intersection = union = 0
    for y in range(a.height):
        for x in range(a.width):
            av, bv = ap[x, y], bp[x, y]
            intersection += int(av and bv)
            union += int(av or bv)
    return round(intersection / union * 100, 2) if union else 0

rows = []
for entry in catalog["entries"]:
    variant = entry["variantId"]
    spec = entry["floorplanSpec"]
    source_path = ROOT / "public" / entry["imageUrl"].lstrip("/")
    source = Image.open(source_path).convert("RGBA")
    source_panel = Image.new("RGBA", (640, 500), "white")
    source.thumbnail((620, 480))
    image_offset = ((640 - source.width) // 2, (500 - source.height) // 2)
    source_panel.alpha_composite(source, image_offset)
    source_content = content_bbox(source)
    target_box = tuple(source_content[i] + (image_offset[0] if i in (0, 2) else image_offset[1]) for i in range(4))
    projection = draw_projection(spec, target_box=target_box)
    before_projection = draw_projection(backup_specs.get(variant, spec), target_box=target_box)
    overlay = source_panel.copy()
    overlay.alpha_composite(draw_projection(spec, target_box=target_box, transparent=True))
    panel = Image.new("RGBA", (2560, 550), "white")
    panel.alpha_composite(before_projection, (0, 35)); panel.alpha_composite(source_panel, (640, 35)); panel.alpha_composite(projection, (1280, 35)); panel.alpha_composite(overlay, (1920, 35))
    labels = ImageDraw.Draw(panel)
    labels.text((12, 8), "校准前投影", fill="black")
    labels.text((652, 8), f"原始二维户型 · {variant}", fill="black")
    labels.text((1292, 8), "自动校准后投影", fill="black")
    labels.text((1932, 8), "原图 + 校准后叠加", fill="black")
    panel.convert("RGB").save(OUT / f"{variant}.png")
    visual_overlap = overlap_percent(source_panel, projection)
    minx, miny, maxx, maxy = bounds(spec["outerPolygon"])
    rebuilt_width, rebuilt_depth = maxx - minx, maxy - miny
    source_scale = "high" if variant in KNOWN else "low"
    source_width, source_depth = KNOWN.get(variant, (None, None))
    room_errors = []
    for room in spec.get("rooms", []):
        rebuilt_area = polygon_area(room["polygon"])
        room_errors.append({"roomName": room.get("name", room["id"]), "sourceArea": None, "rebuiltArea": round(rebuilt_area, 2), "errorPercent": None, "sourceAreaConfidence": "low"})
    def opening_ratios(kind):
        ratios = []
        for opening in spec.get(kind, []):
            wall = next((w for w in spec["walls"] if w["id"] == opening.get("wallId")), None)
            if not wall: continue
            length = math.hypot(wall["end"][0] - wall["start"][0], wall["end"][1] - wall["start"][1]) or 1
            ratios.append({"id": opening.get("id"), "wallId": opening.get("wallId"), "positionRatio": round((opening.get("distance", 0) + opening.get("width", 0) / 2) / length, 4)})
        return ratios
    rows.append({"floorplanId": variant, "sourceImage": entry["imageUrl"], "scaleConfidence": source_scale, "sourceWidth": source_width, "sourceDepth": source_depth, "rebuiltWidth": round(rebuilt_width, 3), "rebuiltDepth": round(rebuilt_depth, 3), "widthErrorPercent": round(abs(rebuilt_width - source_width) / source_width * 100, 2) if source_width else None, "depthErrorPercent": round(abs(rebuilt_depth - source_depth) / source_depth * 100, 2) if source_depth else None, "roomAreaErrorMax": None, "maxRoomAreaErrorPercent": None, "visualOverlapPercent": visual_overlap, "wallAlignment": "needs_visual_review", "doorAlignment": "needs_visual_review", "windowAlignment": "needs_visual_review", "doorPositionRatios": opening_ratios("doors"), "windowPositionRatios": opening_ratios("windows"), "outlineAlignment": "needs_visual_review", "needsManualReview": True, "status": "NEEDS_FIX", "rooms": room_errors})

(OUT / "acceptance-report.json").write_text(json.dumps({"count": len(rows), "report": rows}, ensure_ascii=False, indent=2), encoding="utf-8")
(OUT / "acceptance-report.md").write_text("# 24 户型几何验收\n\n| floorplanId | sourceImage | scaleConfidence | widthErrorPercent | depthErrorPercent | maxRoomAreaErrorPercent | wallAlignment | doorAlignment | windowAlignment | outlineAlignment | needsManualReview | status |\n|---|---|---|---:|---:|---:|---|---|---|---|---|---|\n" + "\n".join(f"| {r['floorplanId']} | {r['sourceImage']} | {r['scaleConfidence']} | {r['widthErrorPercent'] if r['widthErrorPercent'] is not None else 'unknown'} | {r['depthErrorPercent'] if r['depthErrorPercent'] is not None else 'unknown'} | {r['roomAreaErrorMax'] if r['roomAreaErrorMax'] is not None else 'unknown'} | needs_visual_review | {r['doorAlignment']} | {r['windowAlignment']} | {r['outlineAlignment']} (IoU {r['visualOverlapPercent']}%) | {'是' if r['needsManualReview'] else '否'} | {r['status']} |" for r in rows) + "\n\n视觉重叠率是同坐标画布上的像素占用交并比，仅用于风险排序，不替代人工建筑核验。\n", encoding="utf-8")
print(json.dumps({"count": len(rows), "output": str(OUT), "needsManualReview": sum(item["needsManualReview"] for item in rows)}, ensure_ascii=False))
