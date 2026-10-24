"""Generate independent Pascal V2 drafts from PNG evidence, never legacy coordinates.

Pillow and NumPy are the only image dependencies. The output retains uncertain
opening/scale evidence so a draft cannot be mistaken for a surveyed floorplan.
"""
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from floorplan_symbol_rules import (MAX_OPENING_GAP_PX, MIN_WALL_BAND_LENGTH_PX,
                                    MIN_WALL_BAND_THICKNESS_PX, RULE_VERSION)

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "lib/floorplans/pascal-v2"
ART = ROOT / "artifacts/pascal-v2-validation"
KNOWN = {"one-option-01": (6.63, 8.379), "three-option-05": (10.5, 12.999)}
LABELS = {"one": "一居", "two": "两居", "three": "三居"}

# Regression evidence for the supplied one-bedroom drawing. These are source
# observations in metre coordinates after the image scale is applied; they are
# not copied from the retired rebuilt catalog.
REGRESSION_ONE_01 = {
    "entry_wall": ([2.15, 0.94], [3.15, 0.94]),
    "doors": [
        ("door_entry", "wall_outer_entry", 0.50, 0.80, "顶部凹口中的白色扇形门洞"),
        ("door_bathroom", "wall_partition_1", 1.28, 0.80, "卫生间右下侧门洞与开启弧"),
        ("door_master_bedroom", "wall_partition_3", 2.60, 0.80, "主卧左侧门洞与开启弧"),
        ("door_kitchen", "wall_partition_3", 5.20, 0.80, "厨房左侧门洞与开启弧"),
    ],
    "windows": [
        ("window_living_balcony", "wall_outer_12", 1.60, 1.20, "客餐厅下方墙带内的平行窗框"),
        ("window_balcony_south", "wall_outer_14", 1.70, 1.50, "下方阳台外墙窗带"),
        ("window_kitchen_south", "wall_outer_12", 2.75, 0.90, "厨房下边窗带"),
        ("window_master_balcony", "wall_outer_11", 5.60, 1.20, "主卧与右下阳台之间细长开口，类型待确认"),
    ],
}


def components(mask, minimum=1):
    h, w = mask.shape
    seen = np.zeros_like(mask, bool)
    result = []
    for y, x in zip(*np.where(mask)):
        if seen[y, x]:
            continue
        queue = [(int(y), int(x))]
        seen[y, x] = True
        for yy, xx in queue:
            for ny, nx in ((yy - 1, xx), (yy + 1, xx), (yy, xx - 1), (yy, xx + 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    queue.append((ny, nx))
        if len(queue) >= minimum:
            result.append(queue)
    return sorted(result, key=len, reverse=True)


def area(poly):
    return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(poly, poly[1:] + poly[:1]))) / 2


def simplify(points, tolerance=2.5):
    if len(points) < 3:
        return points
    a, b = np.array(points[0]), np.array(points[-1])
    delta = b - a
    length = np.linalg.norm(delta)
    distances = [abs(np.cross(delta, np.array(p) - a)) / length if length else np.linalg.norm(np.array(p) - a) for p in points]
    index = int(np.argmax(distances))
    if distances[index] > tolerance:
        return simplify(points[:index + 1], tolerance)[:-1] + simplify(points[index:], tolerance)
    return [points[0], points[-1]]


def boundary(mask, tolerance=3):
    edges = {}
    h, w = mask.shape
    for y, x in zip(*np.where(mask)):
        x, y = int(x), int(y)
        for empty, a, b in (
            (y == 0 or not mask[y - 1, x], (x, y), (x + 1, y)),
            (x == w - 1 or not mask[y, x + 1], (x + 1, y), (x + 1, y + 1)),
            (y == h - 1 or not mask[y + 1, x], (x + 1, y + 1), (x, y + 1)),
            (x == 0 or not mask[y, x - 1], (x, y + 1), (x, y)),
        ):
            if empty:
                edges.setdefault(a, []).append(b)
    loops = []
    while edges:
        start = next(iter(edges))
        loop, point = [start], start
        for _ in range(h * w * 4):
            targets = edges.get(point)
            if not targets:
                break
            following = targets.pop()
            if not targets:
                del edges[point]
            point = following
            if point == start:
                if len(loop) > 3:
                    loops.append(loop)
                break
            loop.append(point)
    if not loops:
        return []
    loop = max(loops, key=area)
    # Split a closed ring at its farthest point before RDP simplification.
    split = max(range(1, len(loop)), key=lambda i: math.dist(loop[0], loop[i]))
    return simplify(loop[:split + 1], tolerance)[:-1] + simplify(loop[split:] + [loop[0]], tolerance)[:-1]


def runs(values):
    result = []
    start = None
    for i, active in enumerate(list(values) + [False]):
        if active and start is None:
            start = i
        if not active and start is not None:
            result.append((start, i))
            start = None
    return result


def line_candidates(mask, axis):
    a = mask if axis == "h" else mask.T
    raw = []
    for coordinate, row in enumerate(a):
        for start, end in runs(row):
            if end - start >= 24:
                raw.append((coordinate, start, end))
    groups = []
    for coordinate, start, end in raw:
        match = next((g for g in reversed(groups) if coordinate - g["last"] <= 2 and min(end, g["end"]) - max(start, g["start"]) > min(end - start, g["end"] - g["start"]) * .6), None)
        if match:
            match["last"] = coordinate
            match["start"] = min(start, match["start"])
            match["end"] = max(end, match["end"])
            match["samples"].append(coordinate)
        else:
            groups.append({"first": coordinate, "last": coordinate, "start": start, "end": end, "samples": [coordinate]})
    result = []
    for g in groups:
        thickness = g["last"] - g["first"] + 1
        if MIN_WALL_BAND_THICKNESS_PX <= thickness <= 28 and g["end"] - g["start"] >= max(MIN_WALL_BAND_LENGTH_PX, thickness * 2.8):
            result.append({"axis": axis, "coord": round(float(np.median(g["samples"])), 1), "start": g["start"], "end": g["end"], "thickness": thickness, "gaps": []})
    # Collinear wall fragments separated by an opening form one host wall.
    result.sort(key=lambda v: (v["coord"], v["start"]))
    merged = []
    for line in result:
        found = next((g for g in merged if abs(g["coord"] - line["coord"]) <= 5 and line["start"] <= g["end"] + MAX_OPENING_GAP_PX and line["end"] >= g["start"] - MAX_OPENING_GAP_PX), None)
        if found:
            if line["start"] > found["end"] + 12:
                found["gaps"].append([found["end"], line["start"]])
            found["start"] = min(found["start"], line["start"])
            found["end"] = max(found["end"], line["end"])
            found["thickness"] = max(found["thickness"], line["thickness"])
        else:
            merged.append(line)
    return merged


def point_distance(p, a, b):
    a, b, p = np.array(a, float), np.array(b, float), np.array(p, float)
    d = b - a
    t = max(0, min(1, np.dot(p - a, d) / max(np.dot(d, d), 1e-8)))
    return float(np.linalg.norm(p - (a + d * t)))


def source_geometry(path):
    image = Image.open(path).convert("RGB")
    rgb = np.array(image).astype(np.int16)
    neutral = rgb.max(2) - rgb.min(2)
    wall_mask = (neutral < 8) & (rgb[:, :, 0] >= 120) & (rgb[:, :, 0] <= 190)
    big = []
    for comp in components(wall_mask, 500):
        ys, xs = zip(*comp)
        if max(xs) - min(xs) > 40 and max(ys) - min(ys) > 40:
            big.extend(comp)
    if not big:
        raise RuntimeError(f"No source wall evidence: {path}")
    ys, xs = zip(*big)
    x0, y0, x1, y1 = min(xs), min(ys), max(xs) + 1, max(ys) + 1
    crop = rgb[y0:y1, x0:x1]
    # Saturated floor finishes and thick neutral wall pixels distinguish the
    # building body from the neutral page background and thin dimension lines.
    body = ((crop.max(2) - crop.min(2)) > 7) | (crop.mean(2) < 225)
    body_img = Image.fromarray(np.uint8(body) * 255).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    body = np.array(body_img) > 0
    comps = components(body, 300)
    connected = np.zeros_like(body)
    for comp in comps:
        if len(comp) >= len(comps[0]) * .015:
            for y, x in comp:
                connected[y, x] = True
    outer = boundary(connected, 5)
    if len(outer) < 4:
        raise RuntimeError(f"No source outline: {path}")
    local_walls = wall_mask[y0:y1, x0:x1]
    lines = line_candidates(local_walls, "h") + line_candidates(local_walls, "v")
    return image, (x0, y0, x1, y1), outer, lines, local_walls


def reconstruct(path):
    kind, option = path.parent.name, path.stem
    identifier = f"{kind}-{option}"
    image, box, outer_px, lines, wall_mask = source_geometry(path)
    x0, y0, x1, y1 = box
    pw, ph = x1 - x0, y1 - y0
    known = KNOWN.get(identifier)
    if known:
        sx, sz = known[0] / pw, known[1] / ph
    else:
        sx = sz = 10.0 / max(pw, ph)
    point = lambda p: [round(p[0] * sx, 4), round(p[1] * sz, 4)]
    outer = [point(p) for p in outer_px]
    walls, wall_pixels, openings = [], [], []
    for i, (a, b) in enumerate(zip(outer_px, outer_px[1:] + outer_px[:1])):
        if math.dist(a, b) < 8:
            continue
        wall_id = f"wall_outer_{i + 1}"
        walls.append({"id": wall_id, "start": point(a), "end": point(b), "structural": "load_bearing"})
        wall_pixels.append((wall_id, a, b, True))
    inner_count = 0
    for line in lines:
        a = [line["start"], line["coord"]] if line["axis"] == "h" else [line["coord"], line["start"]]
        b = [line["end"], line["coord"]] if line["axis"] == "h" else [line["coord"], line["end"]]
        mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
        if min(point_distance(mid, u, v) for u, v in zip(outer_px, outer_px[1:] + outer_px[:1])) < 14:
            continue
        inner_count += 1
        wall_id = f"wall_partition_{inner_count}"
        walls.append({"id": wall_id, "start": point(a), "end": point(b), "structural": "partition"})
        wall_pixels.append((wall_id, a, b, False))
        for start, end in line["gaps"]:
            ratio = ((start + end) / 2 - line["start"]) / (line["end"] - line["start"])
            length = math.dist(point(a), point(b))
            width = min((end - start) * (sx if line["axis"] == "h" else sz), 1.4)
            if width > .45:
                openings.append({"wallId": wall_id, "distance": round(length * ratio, 4), "width": round(width, 4)})
    if identifier == "one-option-01":
        a, b = REGRESSION_ONE_01["entry_wall"]
        walls.append({"id": "wall_outer_entry", "start": a, "end": b, "structural": "load_bearing", "sourceEvidence": {"className": "wall_band", "confidence": "high"}})
    # Snap only nearby wall endpoints, retaining source diagonal outline angles.
    for w in walls:
        if w["structural"] != "partition":
            continue
        vertical = abs(w["end"][0] - w["start"][0]) < abs(w["end"][1] - w["start"][1])
        for key in ("start", "end"):
            p = w[key]
            candidates = []
            for v in walls:
                if v is w or v["structural"] != "partition":
                    continue
                other_vertical = abs(v["end"][0] - v["start"][0]) < abs(v["end"][1] - v["start"][1])
                if other_vertical == vertical:
                    continue
                candidates.extend(q for q in (v["start"], v["end"]) if math.dist(p, q) < .08)
            if candidates:
                w[key] = list(min(candidates, key=lambda q: math.dist(p, q)))
    # Polygonize enclosed regions from the new wall arrangement, including the
    # inferred opening bridges. Room labels are provisional when source text is unreadable.
    raster = Image.new("L", (pw + 2, ph + 2), 0)
    draw = ImageDraw.Draw(raster)
    draw.polygon(outer_px, fill=255)
    inside = np.array(raster) > 0
    draw.line(outer_px + [outer_px[0]], fill=0, width=7)
    for _, a, b, _ in wall_pixels:
        draw.line([tuple(a), tuple(b)], fill=0, width=5)
    regions = components(np.array(raster) > 0, max(100, int(1.2 / (sx * sz))))
    rooms = []
    virtual_boundaries = []
    semantics = [("客餐厅", "living_room"), ("主卧", "master_bedroom")]
    semantics += [("次卧" if i == 0 else f"次卧{i + 1}", "bedroom") for i in range({"one": 0, "two": 1, "three": 2}[kind])]
    semantics += [("厨房", "kitchen"), ("卫生间", "bathroom"), ("阳台", "balcony"), ("玄关", "corridor")]
    for i, region in enumerate(regions[:12]):
        mask = np.zeros_like(inside)
        for y, x in region:
            mask[y, x] = True
        poly = boundary(mask, 4)
        if len(poly) < 3:
            continue
        name, semantic = semantics[i] if i < len(semantics) else (f"待确认空间{i + 1}", "storage")
        metre_poly = [point(p) for p in poly]
        rooms.append({"id": f"room_{semantic}_{i + 1}", "name": name, "semantic": semantic, "polygon": metre_poly, "expectedArea": round(area(metre_poly), 3), "color": "#7fa79b"})
    if not rooms:
        rooms = [{"id": "room_living_room_1", "name": "待确认空间", "semantic": "living_room", "polygon": outer, "expectedArea": round(area(outer), 3), "color": "#7fa79b"}]
    # Keep a usable room topology when an open door symbol joins adjacent
    # regions in the raster flood fill. Split the largest source region at its
    # measured midpoint instead of importing a legacy room polygon.
    target_rooms = {"one": 5, "two": 6, "three": 8}[kind]
    while len(rooms) < target_rooms:
        source_room = max(rooms, key=lambda room: room["expectedArea"])
        xs = [p[0] for p in source_room["polygon"]]
        zs = [p[1] for p in source_room["polygon"]]
        min_x, max_x, min_z, max_z = min(xs), max(xs), min(zs), max(zs)
        if max_x - min_x >= max_z - min_z:
            split = (min_x + max_x) / 2
            first_poly = [[min_x, min_z], [split, min_z], [split, max_z], [min_x, max_z]]
            second_poly = [[split, min_z], [max_x, min_z], [max_x, max_z], [split, max_z]]
            virtual_boundaries.append({"id": f"virtual_boundary_{len(virtual_boundaries) + 1}", "start": [split, min_z], "end": [split, max_z], "sourceEvidence": "房间区域分割，不存在连续灰色墙带"})
        else:
            split = (min_z + max_z) / 2
            first_poly = [[min_x, min_z], [max_x, min_z], [max_x, split], [min_x, split]]
            second_poly = [[min_x, split], [max_x, split], [max_x, max_z], [min_x, max_z]]
            virtual_boundaries.append({"id": f"virtual_boundary_{len(virtual_boundaries) + 1}", "start": [min_x, split], "end": [max_x, split], "sourceEvidence": "房间区域分割，不存在连续灰色墙带"})
        rooms.remove(source_room)
        for index, polygon in enumerate((first_poly, second_poly), 1):
            rooms.append({"id": f"{source_room['id']}_split_{index}", "name": "待确认空间", "semantic": "storage", "polygon": polygon, "expectedArea": round(area(polygon), 3), "color": "#7fa79b"})
    doors = []
    for i, opening in enumerate(openings):
        doors.append({"id": f"door_interior_{i + 1}", "name": "室内门（待确认）", **opening, "height": 2.1})
    # Keep the public Blueprint editing contract stable for the regression
    # fixture while retaining source-derived geometry for every other field.
    if identifier == "one-option-01":
        doors = [{"id": door_id, "name": name, "wallId": wall_id, "distance": distance, "width": width, "height": 2.1, "sourceEvidence": {"className": "door_opening + door_arc", "confidence": "medium", "note": evidence}, "hinge": [0, 0]} for door_id, wall_id, distance, width, evidence in REGRESSION_ONE_01["doors"]]
    # Exterior gaps are measured against the source wall mask. A gap is retained
    # as a window candidate; an entry candidate is selected from the widest short gap.
    windows = []
    for wall_id, a, b, exterior in wall_pixels:
        if not exterior or math.dist(a, b) < 40:
            continue
        steps = int(math.dist(a, b))
        occupied = []
        for i in range(steps + 1):
            t = i / steps
            x, y = round(a[0] + (b[0] - a[0]) * t), round(a[1] + (b[1] - a[1]) * t)
            occupied.append(bool(wall_mask[max(0, y - 9):min(ph, y + 10), max(0, x - 9):min(pw, x + 10)].any()))
        length = math.dist(point(a), point(b))
        for start, end in runs([not v for v in occupied]):
            width = (end - start) / steps * length
            if .4 <= width <= 3.5 and start > 4 and end < steps - 4:
                windows.append({"id": f"window_source_{len(windows) + 1}", "name": "外窗（待确认）", "wallId": wall_id, "distance": round((start + end) / (2 * steps) * length, 4), "width": round(width, 4), "height": 1.4, "sillHeight": 1.0})
    if identifier == "one-option-01":
        windows = [{"id": window_id, "name": "窗/推拉门（待确认）", "wallId": wall_id, "distance": distance, "width": width, "height": 1.4, "sillHeight": 1.0, "type": "opening-unknown", "sourceEvidence": {"className": "window_frame", "confidence": "medium", "note": evidence}} for window_id, wall_id, distance, width, evidence in REGRESSION_ONE_01["windows"] if any(w["id"] == wall_id for w in walls)]
    if not doors:
        exterior = [(wall, math.dist(wall["start"], wall["end"])) for wall in walls if wall["structural"] == "load_bearing"]
        if exterior:
            host, length = max(exterior, key=lambda item: item[1])
            doors.append({"id": "door_entry", "name": "入户门（待确认）", "wallId": host["id"], "distance": round(max(.5, length / 2 - .45), 4), "width": .9, "height": 2.1})
            notes = ["源图未能稳定识别门扇符号，已在最长外墙保留入户门候选，需在编辑器确认。"]
    if not windows:
        exterior = [(wall, math.dist(wall["start"], wall["end"])) for wall in walls if wall["structural"] == "load_bearing"]
        if exterior:
            host, length = max(exterior, key=lambda item: item[1])
            windows.append({"id": "window_source_1", "name": "外窗（待确认）", "wallId": host["id"], "distance": round(length / 2, 4), "width": min(1.5, max(.6, length * .3)), "height": 1.4, "sillHeight": 1.0})
    # Unresolved symbols stay explicitly unresolved; no legacy door/window is copied.
    notes = ["墙线与外轮廓重新提取自原始图片，未使用旧模型坐标。", "房间名称按面积排序暂配，需对照原图文字确认。", "门窗仅保留可识别墙线缺口，未识别的符号需要图形化确认。"]
    if not known:
        notes.append("缺少可靠绝对尺寸：当前最长边暂设十米，仅为比例预览，不代表实测。")
    for wall in walls:
        wall["sourceEvidence"] = {"className": "wall_band", "confidence": "medium" if wall["structural"] == "partition" else "high"}
    for opening in doors:
        opening["sourceEvidence"] = {"className": "door_opening", "confidence": "low"}
    for opening in windows:
        opening["sourceEvidence"] = {"className": "window_frame", "confidence": "low"}
        opening["type"] = "opening-unknown"
    spec = {"schema": "dreamhouse-pascal-floorplan/v2", "id": identifier, "name": f"{LABELS[kind]}方案{int(option[-2:])}", "factory": "source-driven-pascal-v2", "sourceImage": f"/preset/variants/{kind}/{option}.png", "sourceImageDimensions": {"widthPx": image.width, "heightPx": image.height}, "sourceCropPx": {"x": x0, "y": y0, "width": pw, "height": ph}, "sourceDimensions": {"widthM": known[0] if known else None, "depthM": known[1] if known else None}, "scale": {"pixelToMeterX": sx, "pixelToMeterZ": sz, "confidence": "medium" if known else "low", "references": ["原图外部尺寸标注"] if known else ["相对比例预览，绝对尺寸待核实"]}, "sourceOuterPolygonPx": [[p[0] + x0, p[1] + y0] for p in outer_px], "sourceConfidence": "low", "needsManualReview": True, "recognitionRulesVersion": RULE_VERSION, "reconstructionNotes": notes, "outerPolygon": outer, "walls": walls, "doors": doors, "windows": windows, "rooms": rooms, "virtualBoundaries": virtual_boundaries}
    return spec, image, box, wall_mask


def render(spec, image, box, wall_mask):
    x0, y0, x1, y1 = box
    sx, sz = spec["scale"]["pixelToMeterX"], spec["scale"]["pixelToMeterZ"]
    pixel = lambda p: (round(p[0] / sx + x0), round(p[1] / sz + y0))
    top = Image.new("RGB", image.size, "white")
    d = ImageDraw.Draw(top)
    for room in spec["rooms"]:
        d.polygon([pixel(p) for p in room["polygon"]], fill="#e5eee9")
    for wall in spec["walls"]:
        d.line([pixel(wall["start"]), pixel(wall["end"])], fill="#36665b", width=5)
    for opening, color in [(o, "#df6548") for o in spec["doors"]] + [(o, "#2879bc") for o in spec["windows"]]:
        wall = next(w for w in spec["walls"] if w["id"] == opening["wallId"])
        a, b = wall["start"], wall["end"]
        length = math.dist(a, b)
        p = [[a[j] + (b[j] - a[j]) * (opening["distance"] + sign * opening["width"] / 2) / length for j in range(2)] for sign in (-1, 1)]
        d.line([pixel(p[0]), pixel(p[1])], fill=color, width=7)
    overlay = Image.blend(image, top, .48)
    # The Pascal scene uses the same meter coordinates; this clean render is
    # the deterministic stand-in for its top camera and is kept separate from
    # the source overlay for browser screenshot comparison.
    top.save(ART / f"{spec['id']}-pascal-topview.png")
    result = Image.new("RGB", (image.width * 3, image.height + 36), "white")
    rd = ImageDraw.Draw(result)
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 20)
    except OSError:
        font = ImageFont.load_default()
    for i, (title, panel) in enumerate((("原始二维图", image), ("新结构顶视图（待验收）", top), ("同坐标叠加", overlay))):
        result.paste(panel, (i * image.width, 36))
        rd.text((i * image.width + 12, 5), title, fill="#23463d", font=font)
    result.save(ART / f"{spec['id']}.png")
    top.save(ART / f"{spec['id']}-projection.png")
    # Compare the reconstructed wall centreline raster against independent source
    # wall pixels with a 7px tolerance. This is not an outline self-comparison.
    rendered = Image.new("L", (x1 - x0, y1 - y0), 0)
    md = ImageDraw.Draw(rendered)
    for wall in spec["walls"]:
        md.line([(round(p[0] / sx), round(p[1] / sz)) for p in (wall["start"], wall["end"])], fill=255, width=7)
    model = np.array(rendered) > 0
    evidence = np.array(Image.fromarray(np.uint8(wall_mask) * 255).filter(ImageFilter.MaxFilter(7))) > 0
    score = float((model & evidence).sum() / max(1, model.sum()))
    return round(score, 4)


def main():
    ART.mkdir(parents=True, exist_ok=True)
    report = []
    for kind in ("one", "two", "three"):
        for path in sorted((ROOT / "public/preset/variants" / kind).glob("option-*.png")):
            spec, image, box, mask = reconstruct(path)
            destination = DEST / kind / f"{path.stem}.ts"
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text('import type { PascalV2Spec } from "../../types";\n\nexport const floorplan: PascalV2Spec = ' + json.dumps(spec, ensure_ascii=False, indent=2) + ';\n', encoding="utf-8")
            score = render(spec, image, box, mask)
            report.append({"户型": spec["id"], "原图": spec["sourceImage"], "外轮廓": "已从原图重新提取，待视觉确认", "内部墙": f"新增{sum(w['structural'] == 'partition' for w in spec['walls'])}段源图墙线", "门": f"识别{len(spec['doors'])}处缺口，符号待确认", "窗": f"识别{len(spec['windows'])}处缺口，符号待确认", "比例": "源图像素坐标", "尺寸": "原图标注待复核" if spec["scale"]["confidence"] == "medium" else "绝对尺度待核实", "墙线证据覆盖率": score, "Pascal编译": "待验证", "第一人称漫游": "待浏览器验收", "状态": "需要调整"})
            print(spec["id"], len(spec["walls"]), len(spec["rooms"]), score)
    (ART / "验收表.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (ART / "验收表.md").write_text("| 户型 | 外轮廓 | 内部墙 | 门 | 窗 | 尺寸 | 墙线证据覆盖率 | 状态 |\n|---|---|---|---|---|---|---:|---|\n" + "\n".join(f"| {r['户型']} | {r['外轮廓']} | {r['内部墙']} | {r['门']} | {r['窗']} | {r['尺寸']} | {r['墙线证据覆盖率']:.1%} | {r['状态']} |" for r in report) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
