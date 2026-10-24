import type { PascalV2Spec } from "../../types";

export const floorplan: PascalV2Spec = {
  "schema": "dreamhouse-pascal-floorplan/v2",
  "id": "two-option-01",
  "name": "两居方案1",
  "factory": "source-driven-pascal-v2",
  "sourceImage": "/preset/variants/two/option-01.png",
  "sourceImageDimensions": {
    "widthPx": 812,
    "heightPx": 792
  },
  "sourceCropPx": {
    "x": 159,
    "y": 95,
    "width": 496,
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
      340,
      95
    ],
    [
      600,
      95
    ],
    [
      600,
      415
    ],
    [
      655,
      415
    ],
    [
      655,
      542
    ],
    [
      582,
      542
    ],
    [
      582,
      719
    ],
    [
      406,
      719
    ],
    [
      406,
      623
    ],
    [
      209,
      623
    ],
    [
      209,
      428
    ],
    [
      159,
      428
    ],
    [
      159,
      158
    ],
    [
      340,
      158
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
      2.9006,
      0.0
    ],
    [
      7.0673,
      0.0
    ],
    [
      7.0673,
      5.1282
    ],
    [
      7.9487,
      5.1282
    ],
    [
      7.9487,
      7.1635
    ],
    [
      6.7788,
      7.1635
    ],
    [
      6.7788,
      10.0
    ],
    [
      3.9583,
      10.0
    ],
    [
      3.9583,
      8.4615
    ],
    [
      0.8013,
      8.4615
    ],
    [
      0.8013,
      5.3365
    ],
    [
      0.0,
      5.3365
    ],
    [
      0.0,
      1.0096
    ],
    [
      2.9006,
      1.0096
    ]
  ],
  "walls": [
    {
      "id": "wall_outer_1",
      "start": [
        2.9006,
        0.0
      ],
      "end": [
        7.0673,
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
        7.0673,
        0.0
      ],
      "end": [
        7.0673,
        5.1282
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
        7.0673,
        5.1282
      ],
      "end": [
        7.9487,
        5.1282
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
        7.9487,
        5.1282
      ],
      "end": [
        7.9487,
        7.1635
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
        7.9487,
        7.1635
      ],
      "end": [
        6.7788,
        7.1635
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
        6.7788,
        7.1635
      ],
      "end": [
        6.7788,
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
        6.7788,
        10.0
      ],
      "end": [
        3.9583,
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
        3.9583,
        10.0
      ],
      "end": [
        3.9583,
        8.4615
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
        3.9583,
        8.4615
      ],
      "end": [
        0.8013,
        8.4615
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
        0.8013,
        8.4615
      ],
      "end": [
        0.8013,
        5.3365
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
        0.8013,
        5.3365
      ],
      "end": [
        0.0,
        5.3365
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
        0.0,
        5.3365
      ],
      "end": [
        0.0,
        1.0096
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
        0.0,
        1.0096
      ],
      "end": [
        2.9006,
        1.0096
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
        2.9006,
        1.0096
      ],
      "end": [
        2.9006,
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
        4.0064,
        3.3974
      ],
      "end": [
        7.0513,
        3.3974
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
        0.8574,
        1.0096
      ],
      "end": [
        0.8574,
        8.4615
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
        4.0545,
        5.1763
      ],
      "end": [
        4.0545,
        8.7821
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
      "distance": 2.1141,
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
      "wallId": "wall_outer_8",
      "distance": 0.8574,
      "width": 0.4648,
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
          0.0641,
          1.0737
        ],
        [
          0.8173,
          1.0737
        ],
        [
          0.8173,
          5.2885
        ],
        [
          0.0641,
          5.2885
        ]
      ],
      "expectedArea": 3.175,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          4.399,
          0.0641
        ],
        [
          7.9006,
          0.0641
        ],
        [
          7.9006,
          5.008
        ],
        [
          4.399,
          5.008
        ]
      ],
      "expectedArea": 17.312,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.8974,
          5.008
        ],
        [
          4.399,
          5.008
        ],
        [
          4.399,
          9.9519
        ],
        [
          0.8974,
          9.9519
        ]
      ],
      "expectedArea": 17.312,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          4.399,
          5.008
        ],
        [
          7.9006,
          5.008
        ],
        [
          7.9006,
          9.9519
        ],
        [
          4.399,
          9.9519
        ]
      ],
      "expectedArea": 17.312,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_1_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.8974,
          0.0641
        ],
        [
          4.399,
          0.0641
        ],
        [
          4.399,
          2.53605
        ],
        [
          0.8974,
          2.53605
        ]
      ],
      "expectedArea": 8.656,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.8974,
          2.53605
        ],
        [
          4.399,
          2.53605
        ],
        [
          4.399,
          5.008
        ],
        [
          0.8974,
          5.008
        ]
      ],
      "expectedArea": 8.656,
      "color": "#7fa79b"
    }
  ],
  "virtualBoundaries": [
    {
      "id": "virtual_boundary_1",
      "start": [
        0.8974,
        5.008
      ],
      "end": [
        7.9006,
        5.008
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_2",
      "start": [
        4.399,
        0.0641
      ],
      "end": [
        4.399,
        5.008
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_3",
      "start": [
        4.399,
        5.008
      ],
      "end": [
        4.399,
        9.9519
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_4",
      "start": [
        0.8974,
        2.53605
      ],
      "end": [
        4.399,
        2.53605
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    }
  ]
};
