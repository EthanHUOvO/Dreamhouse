import type { PascalV2Spec } from "../../types";

export const floorplan: PascalV2Spec = {
  "schema": "dreamhouse-pascal-floorplan/v2",
  "id": "three-option-08",
  "name": "三居方案8",
  "factory": "source-driven-pascal-v2",
  "sourceImage": "/preset/variants/three/option-08.png",
  "sourceImageDimensions": {
    "widthPx": 812,
    "heightPx": 792
  },
  "sourceCropPx": {
    "x": 88,
    "y": 198,
    "width": 638,
    "height": 418
  },
  "sourceDimensions": {
    "widthM": null,
    "depthM": null
  },
  "scale": {
    "pixelToMeterX": 0.01567398119122257,
    "pixelToMeterZ": 0.01567398119122257,
    "confidence": "low",
    "references": [
      "相对比例预览，绝对尺寸待核实"
    ]
  },
  "sourceOuterPolygonPx": [
    [
      338,
      198
    ],
    [
      726,
      198
    ],
    [
      726,
      542
    ],
    [
      550,
      542
    ],
    [
      548,
      616
    ],
    [
      326,
      616
    ],
    [
      326,
      559
    ],
    [
      88,
      559
    ],
    [
      88,
      381
    ],
    [
      182,
      381
    ],
    [
      182,
      245
    ],
    [
      338,
      245
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
      3.9185,
      0.0
    ],
    [
      10.0,
      0.0
    ],
    [
      10.0,
      5.3918
    ],
    [
      7.2414,
      5.3918
    ],
    [
      7.21,
      6.5517
    ],
    [
      3.7304,
      6.5517
    ],
    [
      3.7304,
      5.6583
    ],
    [
      0.0,
      5.6583
    ],
    [
      0.0,
      2.8683
    ],
    [
      1.4734,
      2.8683
    ],
    [
      1.4734,
      0.7367
    ],
    [
      3.9185,
      0.7367
    ]
  ],
  "walls": [
    {
      "id": "wall_outer_1",
      "start": [
        3.9185,
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
        5.3918
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
        5.3918
      ],
      "end": [
        7.2414,
        5.3918
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
        7.2414,
        5.3918
      ],
      "end": [
        7.21,
        6.5517
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
        7.21,
        6.5517
      ],
      "end": [
        3.7304,
        6.5517
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
        3.7304,
        6.5517
      ],
      "end": [
        3.7304,
        5.6583
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
        3.7304,
        5.6583
      ],
      "end": [
        0.0,
        5.6583
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
        5.6583
      ],
      "end": [
        0.0,
        2.8683
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
        2.8683
      ],
      "end": [
        1.4734,
        2.8683
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
        1.4734,
        2.8683
      ],
      "end": [
        1.4734,
        0.7367
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
        1.4734,
        0.7367
      ],
      "end": [
        3.9185,
        0.7367
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
        3.9185,
        0.7367
      ],
      "end": [
        3.9185,
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
        1.4734,
        3.2837
      ],
      "end": [
        4.0909,
        3.2837
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
        3.7461,
        4.9843
      ],
      "end": [
        6.2539,
        4.9843
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
        1.5517,
        0.7367
      ],
      "end": [
        1.5517,
        5.6426
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
        4.0204,
        0.0
      ],
      "end": [
        4.0204,
        3.4326
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
        7.1082,
        0.0
      ],
      "end": [
        7.1082,
        6.5517
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
      "distance": 0.9718,
      "width": 0.627,
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
      "wallId": "wall_outer_2",
      "distance": 1.199,
      "width": 0.6426,
      "height": 1.4,
      "sillHeight": 1.0,
      "sourceEvidence": {
        "className": "window_frame",
        "confidence": "low"
      },
      "type": "opening-unknown"
    },
    {
      "id": "window_source_2",
      "name": "外窗（待确认）",
      "wallId": "wall_outer_2",
      "distance": 3.7696,
      "width": 1.3323,
      "height": 1.4,
      "sillHeight": 1.0,
      "sourceEvidence": {
        "className": "window_frame",
        "confidence": "low"
      },
      "type": "opening-unknown"
    },
    {
      "id": "window_source_3",
      "name": "外窗（待确认）",
      "wallId": "wall_outer_7",
      "distance": 0.3605,
      "width": 0.4075,
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
          3.9342,
          0.7524
        ],
        [
          3.9812,
          3.2445
        ],
        [
          1.5987,
          3.2445
        ],
        [
          1.5987,
          0.7994
        ]
      ],
      "expectedArea": 5.824,
      "color": "#7fa79b"
    },
    {
      "id": "room_bedroom_4",
      "name": "次卧2",
      "semantic": "bedroom",
      "polygon": [
        [
          1.489,
          2.884
        ],
        [
          1.5204,
          5.6113
        ],
        [
          0.0627,
          5.6113
        ],
        [
          0.0627,
          2.931
        ]
      ],
      "expectedArea": 3.899,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          1.5987,
          0.0627
        ],
        [
          4.33385,
          0.0627
        ],
        [
          4.33385,
          3.2837
        ],
        [
          1.5987,
          3.2837
        ]
      ],
      "expectedArea": 8.81,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          4.33385,
          0.0627
        ],
        [
          7.069,
          0.0627
        ],
        [
          7.069,
          3.2837
        ],
        [
          4.33385,
          3.2837
        ]
      ],
      "expectedArea": 8.81,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          1.5987,
          3.2837
        ],
        [
          4.33385,
          3.2837
        ],
        [
          4.33385,
          6.5047
        ],
        [
          1.5987,
          6.5047
        ]
      ],
      "expectedArea": 8.81,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          4.33385,
          3.2837
        ],
        [
          7.069,
          3.2837
        ],
        [
          7.069,
          6.5047
        ],
        [
          4.33385,
          6.5047
        ]
      ],
      "expectedArea": 8.81,
      "color": "#7fa79b"
    },
    {
      "id": "room_master_bedroom_2_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          7.1473,
          0.0627
        ],
        [
          9.953,
          0.0627
        ],
        [
          9.953,
          3.2837
        ],
        [
          7.1473,
          3.2837
        ]
      ],
      "expectedArea": 9.037,
      "color": "#7fa79b"
    },
    {
      "id": "room_master_bedroom_2_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          7.1473,
          3.2837
        ],
        [
          9.953,
          3.2837
        ],
        [
          9.953,
          6.5047
        ],
        [
          7.1473,
          6.5047
        ]
      ],
      "expectedArea": 9.037,
      "color": "#7fa79b"
    }
  ],
  "virtualBoundaries": [
    {
      "id": "virtual_boundary_1",
      "start": [
        1.5987,
        3.2837
      ],
      "end": [
        7.069,
        3.2837
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_2",
      "start": [
        4.33385,
        0.0627
      ],
      "end": [
        4.33385,
        3.2837
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_3",
      "start": [
        4.33385,
        3.2837
      ],
      "end": [
        4.33385,
        6.5047
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_4",
      "start": [
        7.1473,
        3.2837
      ],
      "end": [
        9.953,
        3.2837
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    }
  ]
};
