import type { PascalV2Spec } from "../../types";

export const floorplan: PascalV2Spec = {
  "schema": "dreamhouse-pascal-floorplan/v2",
  "id": "two-option-04",
  "name": "两居方案4",
  "factory": "source-driven-pascal-v2",
  "sourceImage": "/preset/variants/two/option-04.png",
  "sourceImageDimensions": {
    "widthPx": 812,
    "heightPx": 792
  },
  "sourceCropPx": {
    "x": 245,
    "y": 97,
    "width": 324,
    "height": 621
  },
  "sourceDimensions": {
    "widthM": null,
    "depthM": null
  },
  "scale": {
    "pixelToMeterX": 0.01610305958132045,
    "pixelToMeterZ": 0.01610305958132045,
    "confidence": "low",
    "references": [
      "相对比例预览，绝对尺寸待核实"
    ]
  },
  "sourceOuterPolygonPx": [
    [
      245,
      97
    ],
    [
      418,
      97
    ],
    [
      417,
      229
    ],
    [
      514,
      229
    ],
    [
      513,
      367
    ],
    [
      569,
      367
    ],
    [
      569,
      650
    ],
    [
      418,
      650
    ],
    [
      418,
      718
    ],
    [
      245,
      718
    ],
    [
      245,
      367
    ],
    [
      305,
      367
    ],
    [
      305,
      243
    ],
    [
      245,
      243
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
      2.7858,
      0.0
    ],
    [
      2.7697,
      2.1256
    ],
    [
      4.3317,
      2.1256
    ],
    [
      4.3156,
      4.3478
    ],
    [
      5.2174,
      4.3478
    ],
    [
      5.2174,
      8.905
    ],
    [
      2.7858,
      8.905
    ],
    [
      2.7858,
      10.0
    ],
    [
      0.0,
      10.0
    ],
    [
      0.0,
      4.3478
    ],
    [
      0.9662,
      4.3478
    ],
    [
      0.9662,
      2.351
    ],
    [
      0.0,
      2.351
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
        2.7858,
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
        2.7858,
        0.0
      ],
      "end": [
        2.7697,
        2.1256
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
        2.7697,
        2.1256
      ],
      "end": [
        4.3317,
        2.1256
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
        4.3317,
        2.1256
      ],
      "end": [
        4.3156,
        4.3478
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
        4.3156,
        4.3478
      ],
      "end": [
        5.2174,
        4.3478
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
        5.2174,
        4.3478
      ],
      "end": [
        5.2174,
        8.905
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
        5.2174,
        8.905
      ],
      "end": [
        2.7858,
        8.905
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
        2.7858,
        8.905
      ],
      "end": [
        2.7858,
        10.0
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
        2.7858,
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
      "id": "wall_outer_10",
      "start": [
        0.0,
        10.0
      ],
      "end": [
        0.0,
        4.3478
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
        0.0,
        4.3478
      ],
      "end": [
        0.9662,
        4.3478
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
        0.9662,
        4.3478
      ],
      "end": [
        0.9662,
        2.351
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
        0.9662,
        2.351
      ],
      "end": [
        0.0,
        2.351
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
        2.351
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
        2.2303
      ],
      "end": [
        4.3156,
        2.2303
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
        4.4525
      ],
      "end": [
        5.2174,
        4.4525
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
      "distance": 2.0692,
      "width": 1.0145,
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
      "distance": 1.5701,
      "width": 0.5958,
      "height": 2.1,
      "sourceEvidence": {
        "className": "door_opening",
        "confidence": "low"
      }
    },
    {
      "id": "door_interior_3",
      "name": "室内门（待确认）",
      "wallId": "wall_partition_2",
      "distance": 3.2126,
      "width": 0.5958,
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
      "wallId": "wall_outer_8",
      "distance": 0.4348,
      "width": 0.5797,
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
          0.0644,
          2.2705
        ],
        [
          4.2834,
          2.2705
        ],
        [
          4.3156,
          4.4122
        ],
        [
          0.9823,
          4.4122
        ],
        [
          1.0306,
          2.351
        ]
      ],
      "expectedArea": 7.09,
      "color": "#7fa79b"
    },
    {
      "id": "room_bedroom_3",
      "name": "次卧",
      "semantic": "bedroom",
      "polygon": [
        [
          0.0644,
          0.0644
        ],
        [
          2.7375,
          0.0644
        ],
        [
          2.7697,
          2.19
        ],
        [
          0.0644,
          2.19
        ]
      ],
      "expectedArea": 5.716,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0644,
          4.4928
        ],
        [
          2.61675,
          4.4928
        ],
        [
          2.61675,
          7.222250000000001
        ],
        [
          0.0644,
          7.222250000000001
        ]
      ],
      "expectedArea": 6.967,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          2.61675,
          4.4928
        ],
        [
          5.1691,
          4.4928
        ],
        [
          5.1691,
          7.222250000000001
        ],
        [
          2.61675,
          7.222250000000001
        ]
      ],
      "expectedArea": 6.967,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0644,
          7.222250000000001
        ],
        [
          2.61675,
          7.222250000000001
        ],
        [
          2.61675,
          9.9517
        ],
        [
          0.0644,
          9.9517
        ]
      ],
      "expectedArea": 6.967,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          2.61675,
          7.222250000000001
        ],
        [
          5.1691,
          7.222250000000001
        ],
        [
          5.1691,
          9.9517
        ],
        [
          2.61675,
          9.9517
        ]
      ],
      "expectedArea": 6.967,
      "color": "#7fa79b"
    }
  ],
  "virtualBoundaries": [
    {
      "id": "virtual_boundary_1",
      "start": [
        0.0644,
        7.222250000000001
      ],
      "end": [
        5.1691,
        7.222250000000001
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_2",
      "start": [
        2.61675,
        4.4928
      ],
      "end": [
        2.61675,
        7.222250000000001
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_3",
      "start": [
        2.61675,
        7.222250000000001
      ],
      "end": [
        2.61675,
        9.9517
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    }
  ]
};
