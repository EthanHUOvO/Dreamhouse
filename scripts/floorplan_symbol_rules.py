"""Central rules for the current DreamHouse plan drawing style.

The values describe evidence classes, not a blanket grayscale threshold. They
are deliberately kept in one module so a different drawing style can select a
different rule set without changing Pascal compilation.
"""

RULE_VERSION = "gray-wall-band-v2"
SYMBOL_CLASSES = {
    "wall_band": "连续、稳定厚度的灰色实心墙带",
    "door_opening": "墙带中的通行开口",
    "door_leaf": "门扇细线或细长矩形",
    "door_arc": "门开启弧线，仅作二维说明",
    "window_frame": "墙带内平行细长窗框/窗洞",
    "room_fill": "房间地面纹理或浅色填充",
    "annotation": "文字、尺寸线、指北针和辅助符号",
    "virtual_boundary": "仅用于房间归属的虚拟边界",
}

# A true wall band is materially thicker than a door leaf, arc or window line
# in the supplied plans. Pixel values are evaluated after local evidence tests.
MIN_WALL_BAND_THICKNESS_PX = 7
MIN_WALL_BAND_LENGTH_PX = 30
MAX_DOOR_LEAF_THICKNESS_PX = 5
MAX_WINDOW_FRAME_THICKNESS_PX = 5
MAX_OPENING_GAP_PX = 95
