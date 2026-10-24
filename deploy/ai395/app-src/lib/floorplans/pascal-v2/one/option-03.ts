import type { PascalV2Spec } from "../../types";

export const floorplan: PascalV2Spec = {
  "schema": "dreamhouse-pascal-floorplan/v2",
  "id": "one-option-03",
  "name": "一居方案3",
  "factory": "source-driven-pascal-v2",
  "sourceImage": "/preset/variants/one/option-03.png",
  "sourceImageDimensions": {
    "widthPx": 812,
    "heightPx": 792
  },
  "sourceCropPx": {
    "x": 236,
    "y": 94,
    "width": 342,
    "height": 626
  },
  "sourceDimensions": {
    "widthM": null,
    "depthM": null
  },
  "scale": {
    "pixelToMeterX": 0.01597444089456869,
    "pixelToMeterZ": 0.01597444089456869,
    "confidence": "low",
    "references": [
      "相对比例预览，绝对尺寸待核实"
    ]
  },
  "sourceOuterPolygonPx": [
    [
      385,
      94
    ],
    [
      578,
      94
    ],
    [
      578,
      720
    ],
    [
      375,
      720
    ],
    [
      375,
      656
    ],
    [
      236,
      657
    ],
    [
      236,
      303
    ],
    [
      302,
      303
    ],
    [
      301,
      121
    ],
    [
      385,
      121
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
      2.3802,
      0.0
    ],
    [
      5.4633,
      0.0
    ],
    [
      5.4633,
      10.0
    ],
    [
      2.2204,
      10.0
    ],
    [
      2.2204,
      8.9776
    ],
    [
      0.0,
      8.9936
    ],
    [
      0.0,
      3.3387
    ],
    [
      1.0543,
      3.3387
    ],
    [
      1.0383,
      0.4313
    ],
    [
      2.3802,
      0.4313
    ]
  ],
  "walls": [
    {
      "id": "wall_outer_1",
      "start": [
        2.3802,
        0.0
      ],
      "end": [
        5.4633,
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
        5.4633,
        0.0
      ],
      "end": [
        5.4633,
        10.0
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
        5.4633,
        10.0
      ],
      "end": [
        2.2204,
        10.0
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
        2.2204,
        10.0
      ],
      "end": [
        2.2204,
        8.9776
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
        2.2204,
        8.9776
      ],
      "end": [
        0.0,
        8.9936
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
        0.0,
        8.9936
      ],
      "end": [
        0.0,
        3.3387
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
        0.0,
        3.3387
      ],
      "end": [
        1.0543,
        3.3387
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
        1.0543,
        3.3387
      ],
      "end": [
        1.0383,
        0.4313
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
        1.0383,
        0.4313
      ],
      "end": [
        2.3802,
        0.4313
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
        2.3802,
        0.4313
      ],
      "end": [
        2.3802,
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
        3.4265
      ],
      "end": [
        2.5559,
        3.4265
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
        4.8882
      ],
      "end": [
        2.3482,
        4.8882
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
        4.8403,
        8.8818
      ],
      "end": [
        5.4633,
        8.8818
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
        2.2923,
        4.7923
      ],
      "end": [
        2.2923,
        10.0
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
        2.4681,
        0.0
      ],
      "end": [
        2.4681,
        1.9649
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
      "wallId": "wall_outer_2",
      "distance": 4.55,
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
      "distance": 1.27,
      "width": 1.0064,
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
          0.0639,
          4.9361
        ],
        [
          2.2524,
          4.9361
        ],
        [
          2.2524,
          8.9776
        ],
        [
          0.0639,
          8.9457
        ]
      ],
      "expectedArea": 8.81,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0639,
          0.0639
        ],
        [
          2.7396000000000003,
          0.0639
        ],
        [
          2.7396000000000003,
          5.008
        ],
        [
          0.0639,
          5.008
        ]
      ],
      "expectedArea": 13.229,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          2.7396000000000003,
          0.0639
        ],
        [
          5.4153,
          0.0639
        ],
        [
          5.4153,
          5.008
        ],
        [
          2.7396000000000003,
          5.008
        ]
      ],
      "expectedArea": 13.229,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0639,
          5.008
        ],
        [
          2.7396000000000003,
          5.008
        ],
        [
          2.7396000000000003,
          9.9521
        ],
        [
          0.0639,
          9.9521
        ]
      ],
      "expectedArea": 13.229,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          2.7396000000000003,
          5.008
        ],
        [
          5.4153,
          5.008
        ],
        [
          5.4153,
          9.9521
        ],
        [
          2.7396000000000003,
          9.9521
        ]
      ],
      "expectedArea": 13.229,
      "color": "#7fa79b"
    }
  ],
  "virtualBoundaries": [
    {
      "id": "virtual_boundary_1",
      "start": [
        0.0639,
        5.008
      ],
      "end": [
        5.4153,
        5.008
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_2",
      "start": [
        2.7396000000000003,
        0.0639
      ],
      "end": [
        2.7396000000000003,
        5.008
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_3",
      "start": [
        2.7396000000000003,
        5.008
      ],
      "end": [
        2.7396000000000003,
        9.9521
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    }
  ]
};
