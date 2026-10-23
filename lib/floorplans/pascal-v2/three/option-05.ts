import type { PascalV2Spec } from "../../types";

export const floorplan: PascalV2Spec = {
  "schema": "dreamhouse-pascal-floorplan/v2",
  "id": "three-option-05",
  "name": "三居方案5",
  "factory": "source-driven-pascal-v2",
  "sourceImage": "/preset/variants/three/option-05.png",
  "sourceImageDimensions": {
    "widthPx": 812,
    "heightPx": 792
  },
  "sourceCropPx": {
    "x": 179,
    "y": 95,
    "width": 456,
    "height": 624
  },
  "sourceDimensions": {
    "widthM": 10.5,
    "depthM": 12.999
  },
  "scale": {
    "pixelToMeterX": 0.023026315789473683,
    "pixelToMeterZ": 0.02083173076923077,
    "confidence": "medium",
    "references": [
      "原图外部尺寸标注"
    ]
  },
  "sourceOuterPolygonPx": [
    [
      338,
      95
    ],
    [
      604,
      95
    ],
    [
      604,
      274
    ],
    [
      635,
      274
    ],
    [
      635,
      691
    ],
    [
      583,
      686
    ],
    [
      583,
      719
    ],
    [
      519,
      719
    ],
    [
      519,
      686
    ],
    [
      448,
      691
    ],
    [
      448,
      719
    ],
    [
      306,
      719
    ],
    [
      306,
      649
    ],
    [
      281,
      643
    ],
    [
      281,
      677
    ],
    [
      217,
      677
    ],
    [
      217,
      643
    ],
    [
      179,
      649
    ],
    [
      179,
      424
    ],
    [
      338,
      424
    ]
  ],
  "sourceConfidence": "low",
  "needsManualReview": true,
  "recognitionRulesVersion": "gray-wall-band-v2",
  "reconstructionNotes": [
    "墙线与外轮廓重新提取自原始图片，未使用旧模型坐标。",
    "房间名称按面积排序暂配，需对照原图文字确认。",
    "门窗仅保留可识别墙线缺口，未识别的符号需要图形化确认。"
  ],
  "outerPolygon": [
    [
      3.6612,
      0.0
    ],
    [
      9.7862,
      0.0
    ],
    [
      9.7862,
      3.7289
    ],
    [
      10.5,
      3.7289
    ],
    [
      10.5,
      12.4157
    ],
    [
      9.3026,
      12.3116
    ],
    [
      9.3026,
      12.999
    ],
    [
      7.8289,
      12.999
    ],
    [
      7.8289,
      12.3116
    ],
    [
      6.1941,
      12.4157
    ],
    [
      6.1941,
      12.999
    ],
    [
      2.9243,
      12.999
    ],
    [
      2.9243,
      11.5408
    ],
    [
      2.3487,
      11.4158
    ],
    [
      2.3487,
      12.1241
    ],
    [
      0.875,
      12.1241
    ],
    [
      0.875,
      11.4158
    ],
    [
      0.0,
      11.5408
    ],
    [
      0.0,
      6.8536
    ],
    [
      3.6612,
      6.8536
    ]
  ],
  "walls": [
    {
      "id": "wall_outer_1",
      "start": [
        3.6612,
        0.0
      ],
      "end": [
        9.7862,
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
        9.7862,
        0.0
      ],
      "end": [
        9.7862,
        3.7289
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
        9.7862,
        3.7289
      ],
      "end": [
        10.5,
        3.7289
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
        10.5,
        3.7289
      ],
      "end": [
        10.5,
        12.4157
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
        10.5,
        12.4157
      ],
      "end": [
        9.3026,
        12.3116
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
        9.3026,
        12.3116
      ],
      "end": [
        9.3026,
        12.999
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
        9.3026,
        12.999
      ],
      "end": [
        7.8289,
        12.999
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
        7.8289,
        12.999
      ],
      "end": [
        7.8289,
        12.3116
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
        7.8289,
        12.3116
      ],
      "end": [
        6.1941,
        12.4157
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
        6.1941,
        12.4157
      ],
      "end": [
        6.1941,
        12.999
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
        6.1941,
        12.999
      ],
      "end": [
        2.9243,
        12.999
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
        2.9243,
        12.999
      ],
      "end": [
        2.9243,
        11.5408
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
        2.9243,
        11.5408
      ],
      "end": [
        2.3487,
        11.4158
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
        2.3487,
        11.4158
      ],
      "end": [
        2.3487,
        12.1241
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
        2.3487,
        12.1241
      ],
      "end": [
        0.875,
        12.1241
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
        0.875,
        12.1241
      ],
      "end": [
        0.875,
        11.4158
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
        0.875,
        11.4158
      ],
      "end": [
        0.0,
        11.5408
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
        0.0,
        11.5408
      ],
      "end": [
        0.0,
        6.8536
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_19",
      "start": [
        0.0,
        6.8536
      ],
      "end": [
        3.6612,
        6.8536
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_20",
      "start": [
        3.6612,
        6.8536
      ],
      "end": [
        3.6612,
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
        3.6612,
        1.979
      ],
      "end": [
        4.8355,
        1.979
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
        7.7829,
        6.0933
      ],
      "end": [
        10.5,
        6.0933
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
        0.0,
        11.395
      ],
      "end": [
        6.977,
        11.395
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
        5.9408,
        12.2803
      ],
      "end": [
        10.5,
        12.2803
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
        3.0395,
        8.0827
      ],
      "end": [
        3.0395,
        12.999
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
        6.7237,
        0.0
      ],
      "end": [
        6.7237,
        4.9371
      ],
      "structural": "partition",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "medium"
      }
    },
    {
      "id": "wall_partition_7",
      "start": [
        6.8734,
        5.9787
      ],
      "end": [
        6.8734,
        12.4157
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
      "wallId": "wall_partition_4",
      "distance": 2.6365,
      "width": 1.4,
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
      "wallId": "wall_outer_11",
      "distance": 1.5198,
      "width": 1.6119,
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
          3.1086,
          11.4575
        ],
        [
          6.8158,
          11.4575
        ],
        [
          6.8158,
          12.2282
        ],
        [
          5.9408,
          12.2282
        ],
        [
          5.9408,
          12.3324
        ],
        [
          6.5164,
          12.3324
        ],
        [
          6.125,
          12.4157
        ],
        [
          6.125,
          12.9365
        ],
        [
          3.1086,
          12.9365
        ]
      ],
      "expectedArea": 4.991,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          5.2615,
          6.155749999999999
        ],
        [
          10.4309,
          6.155749999999999
        ],
        [
          10.4309,
          12.2282
        ],
        [
          5.2615,
          12.2282
        ]
      ],
      "expectedArea": 31.391,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_1_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0921,
          0.0833
        ],
        [
          5.2615,
          0.0833
        ],
        [
          5.2615,
          3.119525
        ],
        [
          0.0921,
          3.119525
        ]
      ],
      "expectedArea": 15.695,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0921,
          3.119525
        ],
        [
          5.2615,
          3.119525
        ],
        [
          5.2615,
          6.155749999999999
        ],
        [
          0.0921,
          6.155749999999999
        ]
      ],
      "expectedArea": 15.695,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_2_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          5.2615,
          0.0833
        ],
        [
          10.4309,
          0.0833
        ],
        [
          10.4309,
          3.119525
        ],
        [
          5.2615,
          3.119525
        ]
      ],
      "expectedArea": 15.695,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_2_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          5.2615,
          3.119525
        ],
        [
          10.4309,
          3.119525
        ],
        [
          10.4309,
          6.155749999999999
        ],
        [
          5.2615,
          6.155749999999999
        ]
      ],
      "expectedArea": 15.695,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_1_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0921,
          6.155749999999999
        ],
        [
          5.2615,
          6.155749999999999
        ],
        [
          5.2615,
          9.191975
        ],
        [
          0.0921,
          9.191975
        ]
      ],
      "expectedArea": 15.695,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0921,
          9.191975
        ],
        [
          5.2615,
          9.191975
        ],
        [
          5.2615,
          12.2282
        ],
        [
          0.0921,
          12.2282
        ]
      ],
      "expectedArea": 15.695,
      "color": "#7fa79b"
    }
  ],
  "virtualBoundaries": [
    {
      "id": "virtual_boundary_1",
      "start": [
        0.0921,
        6.155749999999999
      ],
      "end": [
        10.4309,
        6.155749999999999
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_2",
      "start": [
        5.2615,
        0.0833
      ],
      "end": [
        5.2615,
        6.155749999999999
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_3",
      "start": [
        5.2615,
        6.155749999999999
      ],
      "end": [
        5.2615,
        12.2282
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_4",
      "start": [
        0.0921,
        3.119525
      ],
      "end": [
        5.2615,
        3.119525
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_5",
      "start": [
        5.2615,
        3.119525
      ],
      "end": [
        10.4309,
        3.119525
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_6",
      "start": [
        0.0921,
        9.191975
      ],
      "end": [
        5.2615,
        9.191975
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    }
  ]
};
