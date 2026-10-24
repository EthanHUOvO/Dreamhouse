import type { PascalV2Spec } from "../../types";

export const floorplan: PascalV2Spec = {
  "schema": "dreamhouse-pascal-floorplan/v2",
  "id": "two-option-05",
  "name": "两居方案5",
  "factory": "source-driven-pascal-v2",
  "sourceImage": "/preset/variants/two/option-05.png",
  "sourceImageDimensions": {
    "widthPx": 812,
    "heightPx": 792
  },
  "sourceCropPx": {
    "x": 288,
    "y": 95,
    "width": 238,
    "height": 624
  },
  "sourceDimensions": {
    "widthM": null,
    "depthM": null
  },
  "scale": {
    "pixelToMeterX": 0.016025641025641024,
    "pixelToMeterZ": 0.016025641025641024,
    "confidence": "low",
    "references": [
      "相对比例预览，绝对尺寸待核实"
    ]
  },
  "sourceOuterPolygonPx": [
    [
      336,
      95
    ],
    [
      472,
      95
    ],
    [
      472,
      151
    ],
    [
      526,
      152
    ],
    [
      526,
      610
    ],
    [
      437,
      610
    ],
    [
      437,
      719
    ],
    [
      288,
      719
    ],
    [
      288,
      368
    ],
    [
      336,
      368
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
      0.7692,
      0.0
    ],
    [
      2.9487,
      0.0
    ],
    [
      2.9487,
      0.8974
    ],
    [
      3.8141,
      0.9135
    ],
    [
      3.8141,
      8.2532
    ],
    [
      2.3878,
      8.2532
    ],
    [
      2.3878,
      10.0
    ],
    [
      0.0,
      10.0
    ],
    [
      0.0,
      4.375
    ],
    [
      0.7692,
      4.375
    ]
  ],
  "walls": [
    {
      "id": "wall_outer_1",
      "start": [
        0.7692,
        0.0
      ],
      "end": [
        2.9487,
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
        2.9487,
        0.0
      ],
      "end": [
        2.9487,
        0.8974
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
        2.9487,
        0.8974
      ],
      "end": [
        3.8141,
        0.9135
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
        3.8141,
        0.9135
      ],
      "end": [
        3.8141,
        8.2532
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
        3.8141,
        8.2532
      ],
      "end": [
        2.3878,
        8.2532
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
        2.3878,
        8.2532
      ],
      "end": [
        2.3878,
        10.0
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
        2.3878,
        10.0
      ],
      "end": [
        0.0,
        10.0
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
        0.0,
        10.0
      ],
      "end": [
        0.0,
        4.375
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
        0.0,
        4.375
      ],
      "end": [
        0.7692,
        4.375
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
        0.7692,
        4.375
      ],
      "end": [
        0.7692,
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
        5.2083
      ],
      "end": [
        1.1859,
        5.2083
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
        2.8446,
        0.016
      ],
      "end": [
        2.8446,
        2.6282
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
      "id": "door_entry",
      "name": "入户门（待确认）",
      "wallId": "wall_outer_4",
      "distance": 3.2198,
      "width": 0.9,
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
      "wallId": "wall_outer_5",
      "distance": 0.8173,
      "width": 0.9295,
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
      "id": "room_living_room_1_split_2_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0641,
          5.008
        ],
        [
          3.766,
          5.008
        ],
        [
          3.766,
          7.4799500000000005
        ],
        [
          0.0641,
          7.4799500000000005
        ]
      ],
      "expectedArea": 9.151,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0641,
          7.4799500000000005
        ],
        [
          3.766,
          7.4799500000000005
        ],
        [
          3.766,
          9.9519
        ],
        [
          0.0641,
          9.9519
        ]
      ],
      "expectedArea": 9.151,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_1_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0641,
          0.0641
        ],
        [
          1.91505,
          0.0641
        ],
        [
          1.91505,
          2.53605
        ],
        [
          0.0641,
          2.53605
        ]
      ],
      "expectedArea": 4.575,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          1.91505,
          0.0641
        ],
        [
          3.766,
          0.0641
        ],
        [
          3.766,
          2.53605
        ],
        [
          1.91505,
          2.53605
        ]
      ],
      "expectedArea": 4.575,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_2_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0641,
          2.53605
        ],
        [
          1.91505,
          2.53605
        ],
        [
          1.91505,
          5.008
        ],
        [
          0.0641,
          5.008
        ]
      ],
      "expectedArea": 4.575,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_2_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          1.91505,
          2.53605
        ],
        [
          3.766,
          2.53605
        ],
        [
          3.766,
          5.008
        ],
        [
          1.91505,
          5.008
        ]
      ],
      "expectedArea": 4.575,
      "color": "#7fa79b"
    }
  ],
  "virtualBoundaries": [
    {
      "id": "virtual_boundary_1",
      "start": [
        0.0641,
        5.008
      ],
      "end": [
        3.766,
        5.008
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_2",
      "start": [
        0.0641,
        2.53605
      ],
      "end": [
        3.766,
        2.53605
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_3",
      "start": [
        0.0641,
        7.4799500000000005
      ],
      "end": [
        3.766,
        7.4799500000000005
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_4",
      "start": [
        1.91505,
        0.0641
      ],
      "end": [
        1.91505,
        2.53605
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_5",
      "start": [
        1.91505,
        2.53605
      ],
      "end": [
        1.91505,
        5.008
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    }
  ]
};
