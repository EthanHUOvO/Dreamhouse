import type { PascalV2Spec } from "../../types";

export const floorplan: PascalV2Spec = {
  "schema": "dreamhouse-pascal-floorplan/v2",
  "id": "three-option-06",
  "name": "三居方案6",
  "factory": "source-driven-pascal-v2",
  "sourceImage": "/preset/variants/three/option-06.png",
  "sourceImageDimensions": {
    "widthPx": 812,
    "heightPx": 792
  },
  "sourceCropPx": {
    "x": 111,
    "y": 100,
    "width": 592,
    "height": 620
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
      127,
      100
    ],
    [
      172,
      100
    ],
    [
      178,
      123
    ],
    [
      204,
      123
    ],
    [
      204,
      100
    ],
    [
      385,
      100
    ],
    [
      403,
      116
    ],
    [
      394,
      168
    ],
    [
      614,
      168
    ],
    [
      643,
      356
    ],
    [
      643,
      414
    ],
    [
      654,
      416
    ],
    [
      683,
      635
    ],
    [
      703,
      720
    ],
    [
      529,
      720
    ],
    [
      529,
      643
    ],
    [
      514,
      643
    ],
    [
      514,
      501
    ],
    [
      191,
      501
    ],
    [
      191,
      426
    ],
    [
      141,
      426
    ],
    [
      141,
      415
    ],
    [
      115,
      415
    ],
    [
      141,
      414
    ],
    [
      141,
      366
    ],
    [
      123,
      366
    ],
    [
      123,
      185
    ],
    [
      111,
      185
    ],
    [
      111,
      119
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
      0.9839,
      0.0
    ],
    [
      1.0806,
      0.371
    ],
    [
      1.5,
      0.371
    ],
    [
      1.5,
      0.0
    ],
    [
      4.4194,
      0.0
    ],
    [
      4.7097,
      0.2581
    ],
    [
      4.5645,
      1.0968
    ],
    [
      8.1129,
      1.0968
    ],
    [
      8.5806,
      4.129
    ],
    [
      8.5806,
      5.0645
    ],
    [
      8.7581,
      5.0968
    ],
    [
      9.2258,
      8.629
    ],
    [
      9.5484,
      10.0
    ],
    [
      6.7419,
      10.0
    ],
    [
      6.7419,
      8.7581
    ],
    [
      6.5,
      8.7581
    ],
    [
      6.5,
      6.4677
    ],
    [
      1.2903,
      6.4677
    ],
    [
      1.2903,
      5.2581
    ],
    [
      0.4839,
      5.2581
    ],
    [
      0.4839,
      5.0806
    ],
    [
      0.0645,
      5.0806
    ],
    [
      0.4839,
      5.0645
    ],
    [
      0.4839,
      4.2903
    ],
    [
      0.1935,
      4.2903
    ],
    [
      0.1935,
      1.371
    ],
    [
      0.0,
      1.371
    ],
    [
      0.0,
      0.3065
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
        0.9839,
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
        0.9839,
        0.0
      ],
      "end": [
        1.0806,
        0.371
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
        1.0806,
        0.371
      ],
      "end": [
        1.5,
        0.371
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
        1.5,
        0.371
      ],
      "end": [
        1.5,
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
        1.5,
        0.0
      ],
      "end": [
        4.4194,
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
        4.4194,
        0.0
      ],
      "end": [
        4.7097,
        0.2581
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
        4.7097,
        0.2581
      ],
      "end": [
        4.5645,
        1.0968
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
        4.5645,
        1.0968
      ],
      "end": [
        8.1129,
        1.0968
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
        8.1129,
        1.0968
      ],
      "end": [
        8.5806,
        4.129
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
        8.5806,
        4.129
      ],
      "end": [
        8.5806,
        5.0645
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
        8.5806,
        5.0645
      ],
      "end": [
        8.7581,
        5.0968
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
        8.7581,
        5.0968
      ],
      "end": [
        9.2258,
        8.629
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
        9.2258,
        8.629
      ],
      "end": [
        9.5484,
        10.0
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
        9.5484,
        10.0
      ],
      "end": [
        6.7419,
        10.0
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
        6.7419,
        10.0
      ],
      "end": [
        6.7419,
        8.7581
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
        6.7419,
        8.7581
      ],
      "end": [
        6.5,
        8.7581
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
        6.5,
        8.7581
      ],
      "end": [
        6.5,
        6.4677
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
        6.5,
        6.4677
      ],
      "end": [
        1.2903,
        6.4677
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
        1.2903,
        6.4677
      ],
      "end": [
        1.2903,
        5.2581
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
        1.2903,
        5.2581
      ],
      "end": [
        0.4839,
        5.2581
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
        0.4839,
        5.2581
      ],
      "end": [
        0.4839,
        5.0806
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_22",
      "start": [
        0.4839,
        5.0806
      ],
      "end": [
        0.0645,
        5.0806
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
        0.0645,
        5.0806
      ],
      "end": [
        0.4839,
        5.0645
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
        0.4839,
        5.0645
      ],
      "end": [
        0.4839,
        4.2903
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
        0.4839,
        4.2903
      ],
      "end": [
        0.1935,
        4.2903
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
        0.1935,
        4.2903
      ],
      "end": [
        0.1935,
        1.371
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
        0.1935,
        1.371
      ],
      "end": [
        0.0,
        1.371
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
        0.0,
        1.371
      ],
      "end": [
        0.0,
        0.3065
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
        0.0,
        0.3065
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
        1.2661
      ],
      "end": [
        1.4194,
        1.2661
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
        0.2097,
        4.1774
      ],
      "end": [
        1.4516,
        4.1774
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
      "wallId": "wall_outer_18",
      "distance": 2.1548,
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
      "wallId": "wall_outer_14",
      "distance": 1.8871,
      "width": 1.0645,
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
      "id": "room_living_room_1_split_1_split_1_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0645,
          0.0645
        ],
        [
          4.7742,
          0.0645
        ],
        [
          4.7742,
          2.536275
        ],
        [
          0.0645,
          2.536275
        ]
      ],
      "expectedArea": 11.641,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0645,
          2.536275
        ],
        [
          4.7742,
          2.536275
        ],
        [
          4.7742,
          5.00805
        ],
        [
          0.0645,
          5.00805
        ]
      ],
      "expectedArea": 11.641,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_2_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          4.7742,
          0.0645
        ],
        [
          9.4839,
          0.0645
        ],
        [
          9.4839,
          2.536275
        ],
        [
          4.7742,
          2.536275
        ]
      ],
      "expectedArea": 11.641,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_2_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          4.7742,
          2.536275
        ],
        [
          9.4839,
          2.536275
        ],
        [
          9.4839,
          5.00805
        ],
        [
          4.7742,
          5.00805
        ]
      ],
      "expectedArea": 11.641,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_1_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0645,
          5.00805
        ],
        [
          4.7742,
          5.00805
        ],
        [
          4.7742,
          7.479825
        ],
        [
          0.0645,
          7.479825
        ]
      ],
      "expectedArea": 11.641,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0645,
          7.479825
        ],
        [
          4.7742,
          7.479825
        ],
        [
          4.7742,
          9.9516
        ],
        [
          0.0645,
          9.9516
        ]
      ],
      "expectedArea": 11.641,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_2_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          4.7742,
          5.00805
        ],
        [
          9.4839,
          5.00805
        ],
        [
          9.4839,
          7.479825
        ],
        [
          4.7742,
          7.479825
        ]
      ],
      "expectedArea": 11.641,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_2_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          4.7742,
          7.479825
        ],
        [
          9.4839,
          7.479825
        ],
        [
          9.4839,
          9.9516
        ],
        [
          4.7742,
          9.9516
        ]
      ],
      "expectedArea": 11.641,
      "color": "#7fa79b"
    }
  ],
  "virtualBoundaries": [
    {
      "id": "virtual_boundary_1",
      "start": [
        0.0645,
        5.00805
      ],
      "end": [
        9.4839,
        5.00805
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_2",
      "start": [
        4.7742,
        0.0645
      ],
      "end": [
        4.7742,
        5.00805
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_3",
      "start": [
        4.7742,
        5.00805
      ],
      "end": [
        4.7742,
        9.9516
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_4",
      "start": [
        0.0645,
        2.536275
      ],
      "end": [
        4.7742,
        2.536275
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_5",
      "start": [
        4.7742,
        2.536275
      ],
      "end": [
        9.4839,
        2.536275
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_6",
      "start": [
        0.0645,
        7.479825
      ],
      "end": [
        4.7742,
        7.479825
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_7",
      "start": [
        4.7742,
        7.479825
      ],
      "end": [
        9.4839,
        7.479825
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    }
  ]
};
