import type { PascalV2Spec } from "../../types";

export const floorplan: PascalV2Spec = {
  "schema": "dreamhouse-pascal-floorplan/v2",
  "id": "one-option-07",
  "name": "一居方案7",
  "factory": "source-driven-pascal-v2",
  "sourceImage": "/preset/variants/one/option-07.png",
  "sourceImageDimensions": {
    "widthPx": 812,
    "heightPx": 792
  },
  "sourceCropPx": {
    "x": 98,
    "y": 107,
    "width": 618,
    "height": 600
  },
  "sourceDimensions": {
    "widthM": null,
    "depthM": null
  },
  "scale": {
    "pixelToMeterX": 0.016181229773462782,
    "pixelToMeterZ": 0.016181229773462782,
    "confidence": "low",
    "references": [
      "相对比例预览，绝对尺寸待核实"
    ]
  },
  "sourceOuterPolygonPx": [
    [
      185,
      107
    ],
    [
      716,
      107
    ],
    [
      716,
      420
    ],
    [
      608,
      420
    ],
    [
      608,
      707
    ],
    [
      185,
      707
    ],
    [
      185,
      532
    ],
    [
      98,
      531
    ],
    [
      98,
      292
    ],
    [
      185,
      292
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
      1.4078,
      0.0
    ],
    [
      10.0,
      0.0
    ],
    [
      10.0,
      5.0647
    ],
    [
      8.2524,
      5.0647
    ],
    [
      8.2524,
      9.7087
    ],
    [
      1.4078,
      9.7087
    ],
    [
      1.4078,
      6.877
    ],
    [
      0.0,
      6.8608
    ],
    [
      0.0,
      2.9935
    ],
    [
      1.4078,
      2.9935
    ]
  ],
  "walls": [
    {
      "id": "wall_outer_1",
      "start": [
        1.4078,
        0.0
      ],
      "end": [
        10.0,
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
        10.0,
        0.0
      ],
      "end": [
        10.0,
        5.0647
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
        10.0,
        5.0647
      ],
      "end": [
        8.2524,
        5.0647
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
        8.2524,
        5.0647
      ],
      "end": [
        8.2524,
        9.7087
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
        8.2524,
        9.7087
      ],
      "end": [
        1.4078,
        9.7087
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
        1.4078,
        9.7087
      ],
      "end": [
        1.4078,
        6.877
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
        1.4078,
        6.877
      ],
      "end": [
        0.0,
        6.8608
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
        6.8608
      ],
      "end": [
        0.0,
        2.9935
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
        2.9935
      ],
      "end": [
        1.4078,
        2.9935
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
        1.4078,
        2.9935
      ],
      "end": [
        1.4078,
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
        1.4078,
        4.8948
      ],
      "end": [
        8.479,
        4.8948
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
        5.8576,
        6.7557
      ],
      "end": [
        8.2524,
        6.7557
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
        1.5534,
        0.0
      ],
      "end": [
        1.5534,
        9.7087
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
        4.8948,
        4.7411
      ],
      "end": [
        4.8948,
        6.0841
      ],
      "structural": "partition",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "medium"
      }
    },
    {
      "id": "wall_partition_5",
      "start": [
        5.9304,
        4.7411
      ],
      "end": [
        5.9304,
        5.5178
      ],
      "structural": "partition",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "medium"
      }
    },
    {
      "id": "wall_partition_6",
      "start": [
        8.1553,
        0.0
      ],
      "end": [
        8.1553,
        1.2945
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
      "distance": 2.7346,
      "width": 1.1327,
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
      "distance": 5.8819,
      "width": 1.2783,
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
      "wallId": "wall_outer_3",
      "distance": 0.9466,
      "width": 0.89,
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
          1.4725,
          0.0647
        ],
        [
          1.521,
          4.8544
        ],
        [
          1.4078,
          4.8544
        ],
        [
          1.4078,
          4.9353
        ],
        [
          1.521,
          4.9353
        ],
        [
          1.521,
          9.6602
        ],
        [
          1.4725,
          6.877
        ],
        [
          0.0647,
          6.8285
        ],
        [
          0.0647,
          3.0583
        ],
        [
          1.4725,
          3.0097
        ]
      ],
      "expectedArea": 5.649,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          1.6019,
          0.0647
        ],
        [
          5.7767,
          0.0647
        ],
        [
          5.7767,
          4.86245
        ],
        [
          1.6019,
          4.86245
        ]
      ],
      "expectedArea": 20.03,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          5.7767,
          0.0647
        ],
        [
          9.9515,
          0.0647
        ],
        [
          9.9515,
          4.86245
        ],
        [
          5.7767,
          4.86245
        ]
      ],
      "expectedArea": 20.03,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          1.6019,
          4.86245
        ],
        [
          5.7767,
          4.86245
        ],
        [
          5.7767,
          9.6602
        ],
        [
          1.6019,
          9.6602
        ]
      ],
      "expectedArea": 20.03,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          5.7767,
          4.86245
        ],
        [
          9.9515,
          4.86245
        ],
        [
          9.9515,
          9.6602
        ],
        [
          5.7767,
          9.6602
        ]
      ],
      "expectedArea": 20.03,
      "color": "#7fa79b"
    }
  ],
  "virtualBoundaries": [
    {
      "id": "virtual_boundary_1",
      "start": [
        1.6019,
        4.86245
      ],
      "end": [
        9.9515,
        4.86245
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_2",
      "start": [
        5.7767,
        0.0647
      ],
      "end": [
        5.7767,
        4.86245
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_3",
      "start": [
        5.7767,
        4.86245
      ],
      "end": [
        5.7767,
        9.6602
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    }
  ]
};
