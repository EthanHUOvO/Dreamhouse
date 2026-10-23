import type { PascalV2Spec } from "../../types";

export const floorplan: PascalV2Spec = {
  "schema": "dreamhouse-pascal-floorplan/v2",
  "id": "three-option-04",
  "name": "三居方案4",
  "factory": "source-driven-pascal-v2",
  "sourceImage": "/preset/variants/three/option-04.png",
  "sourceImageDimensions": {
    "widthPx": 812,
    "heightPx": 792
  },
  "sourceCropPx": {
    "x": 85,
    "y": 224,
    "width": 644,
    "height": 366
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
      191,
      224
    ],
    [
      665,
      224
    ],
    [
      665,
      351
    ],
    [
      729,
      351
    ],
    [
      729,
      482
    ],
    [
      665,
      482
    ],
    [
      665,
      590
    ],
    [
      567,
      590
    ],
    [
      567,
      492
    ],
    [
      505,
      492
    ],
    [
      505,
      401
    ],
    [
      192,
      401
    ],
    [
      192,
      466
    ],
    [
      156,
      466
    ],
    [
      85,
      401
    ],
    [
      85,
      330
    ],
    [
      106,
      301
    ],
    [
      124,
      310
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
      1.646,
      0.0
    ],
    [
      9.0062,
      0.0
    ],
    [
      9.0062,
      1.972
    ],
    [
      10.0,
      1.972
    ],
    [
      10.0,
      4.0062
    ],
    [
      9.0062,
      4.0062
    ],
    [
      9.0062,
      5.6832
    ],
    [
      7.4845,
      5.6832
    ],
    [
      7.4845,
      4.1615
    ],
    [
      6.5217,
      4.1615
    ],
    [
      6.5217,
      2.7484
    ],
    [
      1.6615,
      2.7484
    ],
    [
      1.6615,
      3.7578
    ],
    [
      1.1025,
      3.7578
    ],
    [
      0.0,
      2.7484
    ],
    [
      0.0,
      1.646
    ],
    [
      0.3261,
      1.1957
    ],
    [
      0.6056,
      1.3354
    ]
  ],
  "walls": [
    {
      "id": "wall_outer_1",
      "start": [
        1.646,
        0.0
      ],
      "end": [
        9.0062,
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
        9.0062,
        0.0
      ],
      "end": [
        9.0062,
        1.972
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
        9.0062,
        1.972
      ],
      "end": [
        10.0,
        1.972
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
        10.0,
        1.972
      ],
      "end": [
        10.0,
        4.0062
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
        10.0,
        4.0062
      ],
      "end": [
        9.0062,
        4.0062
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
        9.0062,
        4.0062
      ],
      "end": [
        9.0062,
        5.6832
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
        9.0062,
        5.6832
      ],
      "end": [
        7.4845,
        5.6832
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
        7.4845,
        5.6832
      ],
      "end": [
        7.4845,
        4.1615
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
        7.4845,
        4.1615
      ],
      "end": [
        6.5217,
        4.1615
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
        6.5217,
        4.1615
      ],
      "end": [
        6.5217,
        2.7484
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
        6.5217,
        2.7484
      ],
      "end": [
        1.6615,
        2.7484
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
        1.6615,
        2.7484
      ],
      "end": [
        1.6615,
        3.7578
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
        1.6615,
        3.7578
      ],
      "end": [
        1.1025,
        3.7578
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
        1.1025,
        3.7578
      ],
      "end": [
        0.0,
        2.7484
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
        2.7484
      ],
      "end": [
        0.0,
        1.646
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
        0.0,
        1.646
      ],
      "end": [
        0.3261,
        1.1957
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
        0.3261,
        1.1957
      ],
      "end": [
        0.6056,
        1.3354
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
        0.6056,
        1.3354
      ],
      "end": [
        1.646,
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
        7.2671,
        3.9907
      ],
      "end": [
        10.0,
        3.9907
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
        3.8898,
        0.0
      ],
      "end": [
        3.8898,
        1.9565
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
        6.5916,
        0.0
      ],
      "end": [
        6.5916,
        4.1615
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
        8.913,
        0.0
      ],
      "end": [
        8.913,
        5.6832
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
      "wallId": "wall_partition_3",
      "distance": 2.2671,
      "width": 0.6211,
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
      "wallId": "wall_outer_1",
      "distance": 3.6801,
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
      "id": "room_bedroom_3",
      "name": "次卧",
      "semantic": "bedroom",
      "polygon": [
        [
          8.9596,
          1.9876
        ],
        [
          9.9534,
          2.0342
        ],
        [
          9.9534,
          3.9596
        ],
        [
          8.9596,
          3.9596
        ]
      ],
      "expectedArea": 1.937,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0621,
          0.0621
        ],
        [
          3.3074500000000002,
          0.0621
        ],
        [
          3.3074500000000002,
          1.88665
        ],
        [
          0.0621,
          1.88665
        ]
      ],
      "expectedArea": 5.921,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0621,
          1.88665
        ],
        [
          3.3074500000000002,
          1.88665
        ],
        [
          3.3074500000000002,
          3.7112
        ],
        [
          0.0621,
          3.7112
        ]
      ],
      "expectedArea": 5.921,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          3.3074500000000002,
          0.0621
        ],
        [
          6.5528,
          0.0621
        ],
        [
          6.5528,
          1.88665
        ],
        [
          3.3074500000000002,
          1.88665
        ]
      ],
      "expectedArea": 5.921,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          3.3074500000000002,
          1.88665
        ],
        [
          6.5528,
          1.88665
        ],
        [
          6.5528,
          3.7112
        ],
        [
          3.3074500000000002,
          3.7112
        ]
      ],
      "expectedArea": 5.921,
      "color": "#7fa79b"
    },
    {
      "id": "room_master_bedroom_2_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          6.6304,
          2.84935
        ],
        [
          8.882,
          2.84935
        ],
        [
          8.882,
          5.6366
        ],
        [
          6.6304,
          5.6366
        ]
      ],
      "expectedArea": 6.276,
      "color": "#7fa79b"
    },
    {
      "id": "room_master_bedroom_2_split_1_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          6.6304,
          0.0621
        ],
        [
          8.882,
          0.0621
        ],
        [
          8.882,
          1.455725
        ],
        [
          6.6304,
          1.455725
        ]
      ],
      "expectedArea": 3.138,
      "color": "#7fa79b"
    },
    {
      "id": "room_master_bedroom_2_split_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          6.6304,
          1.455725
        ],
        [
          8.882,
          1.455725
        ],
        [
          8.882,
          2.84935
        ],
        [
          6.6304,
          2.84935
        ]
      ],
      "expectedArea": 3.138,
      "color": "#7fa79b"
    }
  ],
  "virtualBoundaries": [
    {
      "id": "virtual_boundary_1",
      "start": [
        3.3074500000000002,
        0.0621
      ],
      "end": [
        3.3074500000000002,
        3.7112
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_2",
      "start": [
        0.0621,
        1.88665
      ],
      "end": [
        3.3074500000000002,
        1.88665
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_3",
      "start": [
        3.3074500000000002,
        1.88665
      ],
      "end": [
        6.5528,
        1.88665
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_4",
      "start": [
        6.6304,
        2.84935
      ],
      "end": [
        8.882,
        2.84935
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_5",
      "start": [
        6.6304,
        1.455725
      ],
      "end": [
        8.882,
        1.455725
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    }
  ]
};
