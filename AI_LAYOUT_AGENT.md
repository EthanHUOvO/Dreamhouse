# DreamHouse v12 — Interactive AI Layout Agent

v12 removes the key limitation of the old `scenario -> preset scene` path. The main design interaction is now:

```text
Natural-language request
        ↓
POST /api/ai/layout
        ↓
Qwen3.7-plus Function Calling
        ↓
DreamHouse layout tools
        ↓
Temporary SceneGraph
        ↓
Geometry validation
        ↓
2D + Pascal 3D preview
        ↓
User clicks “Apply to Design”
        ↓
DesignVersion.scene
        ↓
Approved → Detailed BOM → MES
```

## Function tools

The model can call:

- `get_house_constraints`
- `get_room_geometry`
- `assign_room_function`
- `merge_rooms`
- `split_room`
- `remove_partition_wall`
- `move_partition_wall`
- `add_door`
- `move_door`
- `remove_door`
- `regenerate_furniture`
- `validate_layout`

The implementation is in `lib/layout-tools.ts`. Qwen never directly edits raw Pascal JSON coordinates. It chooses semantic tools; the Geometry Engine performs the exact SceneGraph mutation.

## Safety / deterministic constraints

- Load-bearing walls and exterior walls cannot be deleted or moved.
- `door_entry` cannot be moved or removed.
- Room split ratios are clamped and minimum room dimensions are checked.
- Room overlap, missing master/living/bathroom, invalid doors and invalid geometry are checked by `validate_layout()`.
- An AI result is preview-only until the user explicitly applies it.
- A failed validation cannot be applied.
- After application, DesignVersion stores the resulting SceneGraph and AI tool history.
- BOM is regenerated from the new approved SceneGraph; old frozen BOMs are not rewritten by the model.

## Example

User:

> 把主卧搬到右下角，原主卧改成书房，卫生间保持不动。

Expected tool behavior:

```text
get_house_constraints
assign_room_function(zone_master -> study)
assign_room_function(zone_gaming -> master_bedroom)
validate_layout
```

The Pascal 2D/3D view immediately shows the preview. If the user applies it, the scene becomes the current Design Version.
