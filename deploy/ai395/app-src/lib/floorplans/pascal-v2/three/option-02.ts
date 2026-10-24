import type { PascalV2Spec } from "../../types";

export const floorplan: PascalV2Spec = {
  "schema": "dreamhouse-pascal-floorplan/v2",
  "id": "three-option-02",
  "name": "三居方案2",
  "factory": "source-driven-pascal-v2",
  "sourceImage": "/preset/variants/three/option-02.png",
  "sourceImageDimensions": {
    "widthPx": 812,
    "heightPx": 792
  },
  "sourceCropPx": {
    "x": 288,
    "y": 91,
    "width": 238,
    "height": 632
  },
  "sourceDimensions": {
    "widthM": null,
    "depthM": null
  },
  "scale": {
    "pixelToMeterX": 0.015822784810126583,
    "pixelToMeterZ": 0.015822784810126583,
    "confidence": "low",
    "references": [
      "相对比例预览，绝对尺寸待核实"
    ]
  },
  "sourceOuterPolygonPx": [
    [
      454,
      91
    ],
    [
      526,
      91
    ],
    [
      526,
      311
    ],
    [
      519,
      311
    ],
    [
      519,
      338
    ],
    [
      526,
      338
    ],
    [
      526,
      723
    ],
    [
      434,
      723
    ],
    [
      434,
      705
    ],
    [
      412,
      705
    ],
    [
      412,
      723
    ],
    [
      310,
      723
    ],
    [
      310,
      437
    ],
    [
      288,
      438
    ],
    [
      288,
      286
    ],
    [
      343,
      287
    ],
    [
      343,
      160
    ],
    [
      454,
      160
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
      2.6266,
      0.0
    ],
    [
      3.7658,
      0.0
    ],
    [
      3.7658,
      3.481
    ],
    [
      3.6551,
      3.481
    ],
    [
      3.6551,
      3.9082
    ],
    [
      3.7658,
      3.9082
    ],
    [
      3.7658,
      10.0
    ],
    [
      2.3101,
      10.0
    ],
    [
      2.3101,
      9.7152
    ],
    [
      1.962,
      9.7152
    ],
    [
      1.962,
      10.0
    ],
    [
      0.3481,
      10.0
    ],
    [
      0.3481,
      5.4747
    ],
    [
      0.0,
      5.4905
    ],
    [
      0.0,
      3.0854
    ],
    [
      0.8703,
      3.1013
    ],
    [
      0.8703,
      1.0918
    ],
    [
      2.6266,
      1.0918
    ]
  ],
  "walls": [
    {
      "id": "wall_outer_1",
      "start": [
        2.6266,
        0.0
      ],
      "end": [
        3.7658,
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
        3.7658,
        0.0
      ],
      "end": [
        3.7658,
        3.481
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
        3.6551,
        3.481
      ],
      "end": [
        3.6551,
        3.9082
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
        3.7658,
        3.9082
      ],
      "end": [
        3.7658,
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
        3.7658,
        10.0
      ],
      "end": [
        2.3101,
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
        2.3101,
        10.0
      ],
      "end": [
        2.3101,
        9.7152
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
        2.3101,
        9.7152
      ],
      "end": [
        1.962,
        9.7152
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
        1.962,
        9.7152
      ],
      "end": [
        1.962,
        10.0
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
        1.962,
        10.0
      ],
      "end": [
        0.3481,
        10.0
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
        0.3481,
        10.0
      ],
      "end": [
        0.3481,
        5.4747
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
        0.3481,
        5.4747
      ],
      "end": [
        0.0,
        5.4905
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
        5.4905
      ],
      "end": [
        0.0,
        3.0854
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
        3.0854
      ],
      "end": [
        0.8703,
        3.1013
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
        0.8703,
        3.1013
      ],
      "end": [
        0.8703,
        1.0918
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_17",
      "start": [
        0.8703,
        1.0918
      ],
      "end": [
        2.6266,
        1.0918
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_18",
      "start": [
        2.6266,
        1.0918
      ],
      "end": [
        2.6266,
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
        3.1646
      ],
      "end": [
        3.7658,
        3.1646
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
        0.0,
        5.3956
      ],
      "end": [
        3.7658,
        5.3956
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
        0.3481,
        9.1456
      ],
      "end": [
        3.7658,
        9.1456
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
        2.1598,
        5.3323
      ],
      "end": [
        2.1598,
        9.7152
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
        2.6899,
        0.7753
      ],
      "end": [
        2.6899,
        3.2437
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
      "distance": 2.7215,
      "width": 1.0127,
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
      "distance": 2.5316,
      "width": 0.6013,
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
      "wallId": "wall_outer_14",
      "distance": 1.1472,
      "width": 0.9652,
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
      "id": "room_bedroom_3",
      "name": "次卧",
      "semantic": "bedroom",
      "polygon": [
        [
          2.1994,
          5.443
        ],
        [
          3.7184,
          5.443
        ],
        [
          3.7184,
          9.1139
        ],
        [
          2.1994,
          9.1139
        ]
      ],
      "expectedArea": 5.576,
      "color": "#7fa79b"
    },
    {
      "id": "room_bedroom_4",
      "name": "次卧2",
      "semantic": "bedroom",
      "polygon": [
        [
          2.6424,
          1.1076
        ],
        [
          2.6582,
          3.1329
        ],
        [
          0.8861,
          3.1329
        ],
        [
          0.9335,
          1.1551
        ]
      ],
      "expectedArea": 3.483,
      "color": "#7fa79b"
    },
    {
      "id": "room_kitchen_5",
      "name": "厨房",
      "semantic": "kitchen",
      "polygon": [
        [
          2.6899,
          0.0633
        ],
        [
          3.7184,
          0.0633
        ],
        [
          3.7184,
          3.1329
        ],
        [
          2.7373,
          3.1329
        ]
      ],
      "expectedArea": 3.084,
      "color": "#7fa79b"
    },
    {
      "id": "room_bathroom_6",
      "name": "卫生间",
      "semantic": "bathroom",
      "polygon": [
        [
          0.4114,
          9.193
        ],
        [
          2.1203,
          9.193
        ],
        [
          2.1203,
          9.6677
        ],
        [
          1.9146,
          9.7152
        ],
        [
          1.9146,
          9.9525
        ],
        [
          0.4114,
          9.9525
        ]
      ],
      "expectedArea": 1.244,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0633,
          3.212
        ],
        [
          1.89085,
          3.212
        ],
        [
          1.89085,
          5.3639
        ],
        [
          0.0633,
          5.3639
        ]
      ],
      "expectedArea": 3.933,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          1.89085,
          3.212
        ],
        [
          3.7184,
          3.212
        ],
        [
          3.7184,
          5.3639
        ],
        [
          1.89085,
          5.3639
        ]
      ],
      "expectedArea": 3.933,
      "color": "#7fa79b"
    },
    {
      "id": "room_master_bedroom_2_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.3639,
          5.443
        ],
        [
          2.1203,
          5.443
        ],
        [
          2.1203,
          7.278449999999999
        ],
        [
          0.3639,
          7.278449999999999
        ]
      ],
      "expectedArea": 3.224,
      "color": "#7fa79b"
    },
    {
      "id": "room_master_bedroom_2_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.3639,
          7.278449999999999
        ],
        [
          2.1203,
          7.278449999999999
        ],
        [
          2.1203,
          9.1139
        ],
        [
          0.3639,
          9.1139
        ]
      ],
      "expectedArea": 3.224,
      "color": "#7fa79b"
    }
  ],
  "virtualBoundaries": [
    {
      "id": "virtual_boundary_1",
      "start": [
        1.89085,
        3.212
      ],
      "end": [
        1.89085,
        5.3639
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_2",
      "start": [
        0.3639,
        7.278449999999999
      ],
      "end": [
        2.1203,
        7.278449999999999
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    }
  ]
};
