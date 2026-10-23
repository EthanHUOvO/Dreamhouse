import type { PascalV2Spec } from "../../types";

export const floorplan: PascalV2Spec = {
  "schema": "dreamhouse-pascal-floorplan/v2",
  "id": "two-option-06",
  "name": "两居方案6",
  "factory": "source-driven-pascal-v2",
  "sourceImage": "/preset/variants/two/option-06.png",
  "sourceImageDimensions": {
    "widthPx": 812,
    "heightPx": 792
  },
  "sourceCropPx": {
    "x": 85,
    "y": 268,
    "width": 644,
    "height": 278
  },
  "sourceDimensions": {
    "widthM": null,
    "depthM": null
  },
  "scale": {
    "pixelToMeterX": 0.015527950310559006,
    "pixelToMeterZ": 0.015527950310559006,
    "confidence": "low",
    "references": [
      "相对比例预览，绝对尺寸待核实"
    ]
  },
  "sourceOuterPolygonPx": [
    [
      202,
      268
    ],
    [
      522,
      268
    ],
    [
      522,
      343
    ],
    [
      666,
      343
    ],
    [
      666,
      330
    ],
    [
      729,
      330
    ],
    [
      729,
      499
    ],
    [
      666,
      499
    ],
    [
      666,
      487
    ],
    [
      522,
      487
    ],
    [
      522,
      546
    ],
    [
      347,
      546
    ],
    [
      347,
      492
    ],
    [
      85,
      492
    ],
    [
      85,
      382
    ],
    [
      202,
      382
    ]
  ],
  "sourceConfidence": "low",
  "needsManualReview": true,
  "recognitionRulesVersion": "gray-wall-band-v2",
  "reconstructionNotes": [
    "墙线与外轮廓重新提取自原始图片，未使用旧模型坐标。",
    "房间名称按面积排序暂配，需对照原图文字确认。",
    "门窗仅保留可识别墙线缺口，未识别的符号需要图形化确认。",
    "缺少可靠绝对尺寸：当前最长边暂设十米，仅为比例预览，不代表实测。"
  ],
  "outerPolygon": [
    [
      1.8168,
      0.0
    ],
    [
      6.7857,
      0.0
    ],
    [
      6.7857,
      1.1646
    ],
    [
      9.0217,
      1.1646
    ],
    [
      9.0217,
      0.9627
    ],
    [
      10.0,
      0.9627
    ],
    [
      10.0,
      3.587
    ],
    [
      9.0217,
      3.587
    ],
    [
      9.0217,
      3.4006
    ],
    [
      6.7857,
      3.4006
    ],
    [
      6.7857,
      4.3168
    ],
    [
      4.0683,
      4.3168
    ],
    [
      4.0683,
      3.4783
    ],
    [
      0.0,
      3.4783
    ],
    [
      0.0,
      1.7702
    ],
    [
      1.8168,
      1.7702
    ]
  ],
  "walls": [
    {
      "id": "wall_outer_1",
      "start": [
        1.8168,
        0.0
      ],
      "end": [
        6.7857,
        0.0
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_2",
      "start": [
        6.7857,
        0.0
      ],
      "end": [
        6.7857,
        1.1646
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_3",
      "start": [
        6.7857,
        1.1646
      ],
      "end": [
        9.0217,
        1.1646
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_4",
      "start": [
        9.0217,
        1.1646
      ],
      "end": [
        9.0217,
        0.9627
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_5",
      "start": [
        9.0217,
        0.9627
      ],
      "end": [
        10.0,
        0.9627
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_6",
      "start": [
        10.0,
        0.9627
      ],
      "end": [
        10.0,
        3.587
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_7",
      "start": [
        10.0,
        3.587
      ],
      "end": [
        9.0217,
        3.587
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_8",
      "start": [
        9.0217,
        3.587
      ],
      "end": [
        9.0217,
        3.4006
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_9",
      "start": [
        9.0217,
        3.4006
      ],
      "end": [
        6.7857,
        3.4006
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_10",
      "start": [
        6.7857,
        3.4006
      ],
      "end": [
        6.7857,
        4.3168
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_11",
      "start": [
        6.7857,
        4.3168
      ],
      "end": [
        4.0683,
        4.3168
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_12",
      "start": [
        4.0683,
        4.3168
      ],
      "end": [
        4.0683,
        3.4783
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_13",
      "start": [
        4.0683,
        3.4783
      ],
      "end": [
        0.0,
        3.4783
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_14",
      "start": [
        0.0,
        3.4783
      ],
      "end": [
        0.0,
        1.7702
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_15",
      "start": [
        0.0,
        1.7702
      ],
      "end": [
        1.8168,
        1.7702
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_16",
      "start": [
        1.8168,
        1.7702
      ],
      "end": [
        1.8168,
        0.0
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_partition_1",
      "start": [
        0.0,
        1.8478
      ],
      "end": [
        4.2236,
        1.8478
      ],
      "structural": "partition",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "medium"
      }
    },
    {
      "id": "wall_partition_2",
      "start": [
        4.146,
        0.0
      ],
      "end": [
        4.146,
        4.3168
      ],
      "structural": "partition",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "medium"
      }
    },
    {
      "id": "wall_partition_3",
      "start": [
        6.7003,
        0.0
      ],
      "end": [
        6.7003,
        4.3168
      ],
      "structural": "partition",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "medium"
      }
    },
    {
      "id": "wall_partition_4",
      "start": [
        9.0994,
        0.9783
      ],
      "end": [
        9.0994,
        3.587
      ],
      "structural": "partition",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "medium"
      }
    }
  ],
  "doors": [
    {
      "id": "door_interior_1",
      "name": "室内门（待确认）",
      "wallId": "wall_partition_2",
      "distance": 2.4845,
      "width": 1.087,
      "height": 2.1,
      "sourceEvidence": {
        "className": "door_opening",
        "confidence": "low"
      }
    },
    {
      "id": "door_interior_2",
      "name": "室内门（待确认）",
      "wallId": "wall_partition_3",
      "distance": 1.7469,
      "width": 0.6056,
      "height": 2.1,
      "sourceEvidence": {
        "className": "door_opening",
        "confidence": "low"
      }
    }
  ],
  "windows": [
    {
      "id": "window_source_1",
      "name": "外窗（待确认）",
      "wallId": "wall_outer_6",
      "distance": 1.3354,
      "width": 1.5528,
      "height": 1.4,
      "sillHeight": 1.0,
      "sourceEvidence": {
        "className": "window_frame",
        "confidence": "low"
      },
      "type": "opening-unknown"
    }
  ],
  "rooms": [
    {
      "id": "room_master_bedroom_2",
      "name": "主卧",
      "semantic": "master_bedroom",
      "polygon": [
        [
          0.0621,
          1.8944
        ],
        [
          4.1149,
          1.8944
        ],
        [
          4.1149,
          3.4783
        ],
        [
          0.0621,
          3.4317
        ]
      ],
      "expectedArea": 6.325,
      "color": "#7fa79b"
    },
    {
      "id": "room_bedroom_3",
      "name": "次卧",
      "semantic": "bedroom",
      "polygon": [
        [
          6.7391,
          1.1801
        ],
        [
          9.0683,
          1.1801
        ],
        [
          9.0683,
          3.4006
        ],
        [
          6.7391,
          3.4006
        ]
      ],
      "expectedArea": 5.172,
      "color": "#7fa79b"
    },
    {
      "id": "room_kitchen_4",
      "name": "厨房",
      "semantic": "kitchen",
      "polygon": [
        [
          1.8789,
          0.0621
        ],
        [
          4.1149,
          0.0621
        ],
        [
          4.1149,
          1.8168
        ],
        [
          1.8323,
          1.8168
        ]
      ],
      "expectedArea": 3.964,
      "color": "#7fa79b"
    },
    {
      "id": "room_bathroom_5",
      "name": "卫生间",
      "semantic": "bathroom",
      "polygon": [
        [
          9.146,
          1.0248
        ],
        [
          9.9534,
          1.0248
        ],
        [
          9.9534,
          3.5404
        ],
        [
          9.146,
          3.5404
        ]
      ],
      "expectedArea": 2.031,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          4.1925,
          0.0621
        ],
        [
          6.6615,
          0.0621
        ],
        [
          6.6615,
          2.16615
        ],
        [
          4.1925,
          2.16615
        ]
      ],
      "expectedArea": 5.195,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          4.1925,
          2.16615
        ],
        [
          6.6615,
          2.16615
        ],
        [
          6.6615,
          4.2702
        ],
        [
          4.1925,
          4.2702
        ]
      ],
      "expectedArea": 5.195,
      "color": "#7fa79b"
    }
  ],
  "virtualBoundaries": [
    {
      "id": "virtual_boundary_1",
      "start": [
        4.1925,
        2.16615
      ],
      "end": [
        6.6615,
        2.16615
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    }
  ]
};
