import type { PascalV2Spec } from "../../types";

export const floorplan: PascalV2Spec = {
  "schema": "dreamhouse-pascal-floorplan/v2",
  "id": "two-option-03",
  "name": "两居方案3",
  "factory": "source-driven-pascal-v2",
  "sourceImage": "/preset/variants/two/option-03.png",
  "sourceImageDimensions": {
    "widthPx": 812,
    "heightPx": 792
  },
  "sourceCropPx": {
    "x": 300,
    "y": 93,
    "width": 214,
    "height": 628
  },
  "sourceDimensions": {
    "widthM": null,
    "depthM": null
  },
  "scale": {
    "pixelToMeterX": 0.01592356687898089,
    "pixelToMeterZ": 0.01592356687898089,
    "confidence": "low",
    "references": [
      "相对比例预览，绝对尺寸待核实"
    ]
  },
  "sourceOuterPolygonPx": [
    [
      300,
      93
    ],
    [
      375,
      93
    ],
    [
      375,
      133
    ],
    [
      514,
      133
    ],
    [
      514,
      721
    ],
    [
      356,
      721
    ],
    [
      356,
      407
    ],
    [
      300,
      407
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
      0.0,
      0.0
    ],
    [
      1.1943,
      0.0
    ],
    [
      1.1943,
      0.6369
    ],
    [
      3.4076,
      0.6369
    ],
    [
      3.4076,
      10.0
    ],
    [
      0.8917,
      10.0
    ],
    [
      0.8917,
      5.0
    ],
    [
      0.0,
      5.0
    ]
  ],
  "walls": [
    {
      "id": "wall_outer_1",
      "start": [
        0.0,
        0.0
      ],
      "end": [
        1.1943,
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
        1.1943,
        0.0
      ],
      "end": [
        1.1943,
        0.6369
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
        1.1943,
        0.6369
      ],
      "end": [
        3.4076,
        0.6369
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
        3.4076,
        0.6369
      ],
      "end": [
        3.4076,
        10.0
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
        3.4076,
        10.0
      ],
      "end": [
        0.8917,
        10.0
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
        0.8917,
        10.0
      ],
      "end": [
        0.8917,
        5.0
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
        0.8917,
        5.0
      ],
      "end": [
        0.0,
        5.0
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
        5.0
      ],
      "end": [
        0.0,
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
        3.7659
      ],
      "end": [
        3.4076,
        3.7659
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
        0.8917,
        8.9331
      ],
      "end": [
        3.4076,
        8.9331
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
        1.1067,
        0.0
      ],
      "end": [
        1.1067,
        4.0287
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
      "wallId": "wall_partition_1",
      "distance": 1.5844,
      "width": 0.7803,
      "height": 2.1,
      "sourceEvidence": {
        "className": "door_opening",
        "confidence": "low"
      }
    },
    {
      "id": "door_interior_2",
      "name": "室内门（待确认）",
      "wallId": "wall_partition_2",
      "distance": 0.7564,
      "width": 0.4618,
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
      "wallId": "wall_outer_4",
      "distance": 4.6815,
      "width": 1.5,
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
          1.1465,
          0.6529
        ],
        [
          3.3599,
          0.7006
        ],
        [
          3.3599,
          3.7261
        ],
        [
          1.1465,
          3.7261
        ]
      ],
      "expectedArea": 6.749,
      "color": "#7fa79b"
    },
    {
      "id": "room_bedroom_3",
      "name": "次卧",
      "semantic": "bedroom",
      "polygon": [
        [
          0.0637,
          0.0637
        ],
        [
          1.0669,
          0.0637
        ],
        [
          1.0669,
          3.7261
        ],
        [
          0.0637,
          3.7261
        ]
      ],
      "expectedArea": 3.674,
      "color": "#7fa79b"
    },
    {
      "id": "room_kitchen_4",
      "name": "厨房",
      "semantic": "kitchen",
      "polygon": [
        [
          0.9554,
          8.9809
        ],
        [
          3.3599,
          8.9809
        ],
        [
          3.3599,
          9.9522
        ],
        [
          0.9554,
          9.9522
        ]
      ],
      "expectedArea": 2.335,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0637,
          6.3535
        ],
        [
          3.3599,
          6.3535
        ],
        [
          3.3599,
          8.9013
        ],
        [
          0.0637,
          8.9013
        ]
      ],
      "expectedArea": 8.398,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0637,
          3.8057
        ],
        [
          1.7118,
          3.8057
        ],
        [
          1.7118,
          6.3535
        ],
        [
          0.0637,
          6.3535
        ]
      ],
      "expectedArea": 4.199,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          1.7118,
          3.8057
        ],
        [
          3.3599,
          3.8057
        ],
        [
          3.3599,
          6.3535
        ],
        [
          1.7118,
          6.3535
        ]
      ],
      "expectedArea": 4.199,
      "color": "#7fa79b"
    }
  ],
  "virtualBoundaries": [
    {
      "id": "virtual_boundary_1",
      "start": [
        0.0637,
        6.3535
      ],
      "end": [
        3.3599,
        6.3535
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_2",
      "start": [
        1.7118,
        3.8057
      ],
      "end": [
        1.7118,
        6.3535
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    }
  ]
};
