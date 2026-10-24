import type { PascalV2Spec } from "../../types";

export const floorplan: PascalV2Spec = {
  "schema": "dreamhouse-pascal-floorplan/v2",
  "id": "three-option-03",
  "name": "三居方案3",
  "factory": "source-driven-pascal-v2",
  "sourceImage": "/preset/variants/three/option-03.png",
  "sourceImageDimensions": {
    "widthPx": 812,
    "heightPx": 792
  },
  "sourceCropPx": {
    "x": 97,
    "y": 99,
    "width": 620,
    "height": 616
  },
  "sourceDimensions": {
    "widthM": null,
    "depthM": null
  },
  "scale": {
    "pixelToMeterX": 0.016129032258064516,
    "pixelToMeterZ": 0.016129032258064516,
    "confidence": "low",
    "references": [
      "相对比例预览，绝对尺寸待核实"
    ]
  },
  "sourceOuterPolygonPx": [
    [
      113,
      99
    ],
    [
      291,
      99
    ],
    [
      291,
      133
    ],
    [
      370,
      133
    ],
    [
      370,
      99
    ],
    [
      636,
      99
    ],
    [
      635,
      299
    ],
    [
      644,
      299
    ],
    [
      644,
      259
    ],
    [
      651,
      259
    ],
    [
      645,
      260
    ],
    [
      645,
      299
    ],
    [
      685,
      299
    ],
    [
      685,
      293
    ],
    [
      686,
      299
    ],
    [
      717,
      299
    ],
    [
      717,
      715
    ],
    [
      361,
      715
    ],
    [
      361,
      679
    ],
    [
      324,
      679
    ],
    [
      324,
      691
    ],
    [
      265,
      691
    ],
    [
      265,
      684
    ],
    [
      253,
      684
    ],
    [
      253,
      715
    ],
    [
      170,
      715
    ],
    [
      170,
      684
    ],
    [
      158,
      684
    ],
    [
      158,
      692
    ],
    [
      113,
      691
    ],
    [
      113,
      455
    ],
    [
      97,
      455
    ],
    [
      97,
      299
    ],
    [
      113,
      299
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
      0.2581,
      0.0
    ],
    [
      3.129,
      0.0
    ],
    [
      3.129,
      0.5484
    ],
    [
      4.4032,
      0.5484
    ],
    [
      4.4032,
      0.0
    ],
    [
      8.6935,
      0.0
    ],
    [
      8.6774,
      3.2258
    ],
    [
      8.8226,
      3.2258
    ],
    [
      8.8226,
      2.5806
    ],
    [
      8.9355,
      2.5806
    ],
    [
      8.8387,
      2.5968
    ],
    [
      8.8387,
      3.2258
    ],
    [
      9.4839,
      3.2258
    ],
    [
      9.4839,
      3.129
    ],
    [
      9.5,
      3.2258
    ],
    [
      10.0,
      3.2258
    ],
    [
      10.0,
      9.9355
    ],
    [
      4.2581,
      9.9355
    ],
    [
      4.2581,
      9.3548
    ],
    [
      3.6613,
      9.3548
    ],
    [
      3.6613,
      9.5484
    ],
    [
      2.7097,
      9.5484
    ],
    [
      2.7097,
      9.4355
    ],
    [
      2.5161,
      9.4355
    ],
    [
      2.5161,
      9.9355
    ],
    [
      1.1774,
      9.9355
    ],
    [
      1.1774,
      9.4355
    ],
    [
      0.9839,
      9.4355
    ],
    [
      0.9839,
      9.5645
    ],
    [
      0.2581,
      9.5484
    ],
    [
      0.2581,
      5.7419
    ],
    [
      0.0,
      5.7419
    ],
    [
      0.0,
      3.2258
    ],
    [
      0.2581,
      3.2258
    ]
  ],
  "walls": [
    {
      "id": "wall_outer_1",
      "start": [
        0.2581,
        0.0
      ],
      "end": [
        3.129,
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
        3.129,
        0.0
      ],
      "end": [
        3.129,
        0.5484
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
        3.129,
        0.5484
      ],
      "end": [
        4.4032,
        0.5484
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
        4.4032,
        0.5484
      ],
      "end": [
        4.4032,
        0.0
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
        4.4032,
        0.0
      ],
      "end": [
        8.6935,
        0.0
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
        8.6935,
        0.0
      ],
      "end": [
        8.6774,
        3.2258
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
        8.6774,
        3.2258
      ],
      "end": [
        8.8226,
        3.2258
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
        8.8226,
        3.2258
      ],
      "end": [
        8.8226,
        2.5806
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
        8.8387,
        2.5968
      ],
      "end": [
        8.8387,
        3.2258
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
        8.8387,
        3.2258
      ],
      "end": [
        9.4839,
        3.2258
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
        9.5,
        3.2258
      ],
      "end": [
        10.0,
        3.2258
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
        10.0,
        3.2258
      ],
      "end": [
        10.0,
        9.9355
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
        10.0,
        9.9355
      ],
      "end": [
        4.2581,
        9.9355
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
        4.2581,
        9.9355
      ],
      "end": [
        4.2581,
        9.3548
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
        4.2581,
        9.3548
      ],
      "end": [
        3.6613,
        9.3548
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
        3.6613,
        9.3548
      ],
      "end": [
        3.6613,
        9.5484
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_21",
      "start": [
        3.6613,
        9.5484
      ],
      "end": [
        2.7097,
        9.5484
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_23",
      "start": [
        2.7097,
        9.4355
      ],
      "end": [
        2.5161,
        9.4355
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_24",
      "start": [
        2.5161,
        9.4355
      ],
      "end": [
        2.5161,
        9.9355
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_25",
      "start": [
        2.5161,
        9.9355
      ],
      "end": [
        1.1774,
        9.9355
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_26",
      "start": [
        1.1774,
        9.9355
      ],
      "end": [
        1.1774,
        9.4355
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_27",
      "start": [
        1.1774,
        9.4355
      ],
      "end": [
        0.9839,
        9.4355
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_28",
      "start": [
        0.9839,
        9.4355
      ],
      "end": [
        0.9839,
        9.5645
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_29",
      "start": [
        0.9839,
        9.5645
      ],
      "end": [
        0.2581,
        9.5484
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_30",
      "start": [
        0.2581,
        9.5484
      ],
      "end": [
        0.2581,
        5.7419
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_31",
      "start": [
        0.2581,
        5.7419
      ],
      "end": [
        0.0,
        5.7419
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_32",
      "start": [
        0.0,
        5.7419
      ],
      "end": [
        0.0,
        3.2258
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_33",
      "start": [
        0.0,
        3.2258
      ],
      "end": [
        0.2581,
        3.2258
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_34",
      "start": [
        0.2581,
        3.2258
      ],
      "end": [
        0.2581,
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
        3.3468
      ],
      "end": [
        4.629,
        3.3468
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
        6.8387,
        3.3468
      ],
      "end": [
        8.8226,
        3.3468
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
        2.8065,
        4.5161
      ],
      "end": [
        3.6613,
        4.5161
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
        8.3065,
        5.0081
      ],
      "end": [
        10.0,
        5.0081
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
        0.0,
        5.6129
      ],
      "end": [
        1.871,
        5.6613
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
        3.4516,
        8.3387
      ],
      "end": [
        10.0,
        8.3387
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
        1.871,
        3.2581
      ],
      "end": [
        1.871,
        5.6613
      ],
      "structural": "partition",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "medium"
      }
    },
    {
      "id": "wall_partition_8",
      "start": [
        3.0161,
        0.0
      ],
      "end": [
        3.0161,
        3.4677
      ],
      "structural": "partition",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "medium"
      }
    },
    {
      "id": "wall_partition_9",
      "start": [
        3.5484,
        4.4677
      ],
      "end": [
        3.5484,
        9.5484
      ],
      "structural": "partition",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "medium"
      }
    },
    {
      "id": "wall_partition_10",
      "start": [
        4.5081,
        0.0
      ],
      "end": [
        4.5081,
        3.4194
      ],
      "structural": "partition",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "medium"
      }
    },
    {
      "id": "wall_partition_11",
      "start": [
        6.8871,
        0.0
      ],
      "end": [
        6.8871,
        3.4839
      ],
      "structural": "partition",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "medium"
      }
    },
    {
      "id": "wall_partition_12",
      "start": [
        7.2339,
        4.6613
      ],
      "end": [
        7.2339,
        8.4677
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
      "distance": 2.4274,
      "width": 0.6935,
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
      "distance": 1.25,
      "width": 0.8871,
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
      "wallId": "wall_outer_3",
      "distance": 0.6855,
      "width": 0.4032,
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
      "wallId": "wall_outer_5",
      "distance": 1.2258,
      "width": 0.7742,
      "height": 1.4,
      "sillHeight": 1.0,
      "sourceEvidence": {
        "className": "window_frame",
        "confidence": "low"
      },
      "type": "opening-unknown"
    },
    {
      "id": "window_source_4",
      "name": "外窗（待确认）",
      "wallId": "wall_outer_5",
      "distance": 3.3064,
      "width": 0.7742,
      "height": 1.4,
      "sillHeight": 1.0,
      "sourceEvidence": {
        "className": "window_frame",
        "confidence": "low"
      },
      "type": "opening-unknown"
    },
    {
      "id": "window_source_5",
      "name": "外窗（待确认）",
      "wallId": "wall_outer_17",
      "distance": 3.2097,
      "width": 2.6129,
      "height": 1.4,
      "sillHeight": 1.0,
      "sourceEvidence": {
        "className": "window_frame",
        "confidence": "low"
      },
      "type": "opening-unknown"
    },
    {
      "id": "window_source_6",
      "name": "外窗（待确认）",
      "wallId": "wall_outer_32",
      "distance": 1.4919,
      "width": 0.4677,
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
          3.5968,
          8.3871
        ],
        [
          7.1935,
          8.3871
        ],
        [
          7.1935,
          8.4839
        ],
        [
          7.2742,
          8.3871
        ],
        [
          9.9516,
          8.3871
        ],
        [
          9.9516,
          9.8871
        ],
        [
          4.3226,
          9.8871
        ],
        [
          4.2742,
          9.3065
        ],
        [
          3.6613,
          9.3065
        ],
        [
          3.5968,
          9.5
        ]
      ],
      "expectedArea": 9.127,
      "color": "#7fa79b"
    },
    {
      "id": "room_bedroom_3",
      "name": "次卧",
      "semantic": "bedroom",
      "polygon": [
        [
          0.3226,
          0.0645
        ],
        [
          2.9839,
          0.0645
        ],
        [
          2.9839,
          3.3065
        ],
        [
          0.0645,
          3.3065
        ],
        [
          0.3226,
          3.2419
        ]
      ],
      "expectedArea": 8.636,
      "color": "#7fa79b"
    },
    {
      "id": "room_bedroom_4",
      "name": "次卧2",
      "semantic": "bedroom",
      "polygon": [
        [
          0.0645,
          3.3871
        ],
        [
          1.8387,
          3.3871
        ],
        [
          1.8387,
          5.5806
        ],
        [
          0.0645,
          5.5806
        ]
      ],
      "expectedArea": 3.892,
      "color": "#7fa79b"
    },
    {
      "id": "room_kitchen_5",
      "name": "厨房",
      "semantic": "kitchen",
      "polygon": [
        [
          3.0645,
          0.0645
        ],
        [
          3.129,
          0.6129
        ],
        [
          4.4677,
          0.5645
        ],
        [
          4.4677,
          3.3065
        ],
        [
          3.0645,
          3.3065
        ]
      ],
      "expectedArea": 3.83,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0645,
          0.0645
        ],
        [
          5.00805,
          0.0645
        ],
        [
          5.00805,
          4.9758000000000004
        ],
        [
          0.0645,
          4.9758000000000004
        ]
      ],
      "expectedArea": 24.279,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0645,
          4.9758000000000004
        ],
        [
          5.00805,
          4.9758000000000004
        ],
        [
          5.00805,
          9.8871
        ],
        [
          0.0645,
          9.8871
        ]
      ],
      "expectedArea": 24.279,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          5.00805,
          0.0645
        ],
        [
          9.9516,
          0.0645
        ],
        [
          9.9516,
          4.9758000000000004
        ],
        [
          5.00805,
          4.9758000000000004
        ]
      ],
      "expectedArea": 24.279,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          5.00805,
          4.9758000000000004
        ],
        [
          9.9516,
          4.9758000000000004
        ],
        [
          9.9516,
          9.8871
        ],
        [
          5.00805,
          9.8871
        ]
      ],
      "expectedArea": 24.279,
      "color": "#7fa79b"
    }
  ],
  "virtualBoundaries": [
    {
      "id": "virtual_boundary_1",
      "start": [
        5.00805,
        0.0645
      ],
      "end": [
        5.00805,
        9.8871
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_2",
      "start": [
        0.0645,
        4.9758000000000004
      ],
      "end": [
        5.00805,
        4.9758000000000004
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_3",
      "start": [
        5.00805,
        4.9758000000000004
      ],
      "end": [
        9.9516,
        4.9758000000000004
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    }
  ]
};
