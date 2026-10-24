import type { PascalV2Spec } from "../../types";

export const floorplan: PascalV2Spec = {
  "schema": "dreamhouse-pascal-floorplan/v2",
  "id": "one-option-08",
  "name": "一居方案8",
  "factory": "source-driven-pascal-v2",
  "sourceImage": "/preset/variants/one/option-08.png",
  "sourceImageDimensions": {
    "widthPx": 812,
    "heightPx": 792
  },
  "sourceCropPx": {
    "x": 103,
    "y": 101,
    "width": 608,
    "height": 613
  },
  "sourceDimensions": {
    "widthM": null,
    "depthM": null
  },
  "scale": {
    "pixelToMeterX": 0.01631321370309951,
    "pixelToMeterZ": 0.01631321370309951,
    "confidence": "low",
    "references": [
      "相对比例预览，绝对尺寸待核实"
    ]
  },
  "sourceOuterPolygonPx": [
    [
      402,
      101
    ],
    [
      449,
      149
    ],
    [
      440,
      147
    ],
    [
      442,
      155
    ],
    [
      434,
      157
    ],
    [
      488,
      218
    ],
    [
      495,
      220
    ],
    [
      493,
      212
    ],
    [
      502,
      210
    ],
    [
      626,
      352
    ],
    [
      711,
      352
    ],
    [
      711,
      714
    ],
    [
      103,
      714
    ],
    [
      103,
      606
    ],
    [
      178,
      606
    ],
    [
      178,
      420
    ],
    [
      194,
      329
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
      4.8777,
      0.0
    ],
    [
      5.6444,
      0.783
    ],
    [
      5.4976,
      0.7504
    ],
    [
      5.5302,
      0.8809
    ],
    [
      5.3997,
      0.9135
    ],
    [
      6.2806,
      1.9086
    ],
    [
      6.3948,
      1.9413
    ],
    [
      6.3622,
      1.8108
    ],
    [
      6.509,
      1.7781
    ],
    [
      8.5318,
      4.0946
    ],
    [
      9.9184,
      4.0946
    ],
    [
      9.9184,
      10.0
    ],
    [
      0.0,
      10.0
    ],
    [
      0.0,
      8.2382
    ],
    [
      1.2235,
      8.2382
    ],
    [
      1.2235,
      5.2039
    ],
    [
      1.4845,
      3.7194
    ]
  ],
  "walls": [
    {
      "id": "wall_outer_1",
      "start": [
        4.8777,
        0.0
      ],
      "end": [
        5.6444,
        0.783
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
        5.6444,
        0.783
      ],
      "end": [
        5.4976,
        0.7504
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
        5.4976,
        0.7504
      ],
      "end": [
        5.5302,
        0.8809
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
        5.5302,
        0.8809
      ],
      "end": [
        5.3997,
        0.9135
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
        5.3997,
        0.9135
      ],
      "end": [
        6.2806,
        1.9086
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
        6.3948,
        1.9413
      ],
      "end": [
        6.3622,
        1.8108
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
        6.3622,
        1.8108
      ],
      "end": [
        6.509,
        1.7781
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
        6.509,
        1.7781
      ],
      "end": [
        8.5318,
        4.0946
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
        8.5318,
        4.0946
      ],
      "end": [
        9.9184,
        4.0946
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
        9.9184,
        4.0946
      ],
      "end": [
        9.9184,
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
        9.9184,
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
      "id": "wall_outer_13",
      "start": [
        0.0,
        10.0
      ],
      "end": [
        0.0,
        8.2382
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
        8.2382
      ],
      "end": [
        1.2235,
        8.2382
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
        1.2235,
        8.2382
      ],
      "end": [
        1.2235,
        5.2039
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
        1.2235,
        5.2039
      ],
      "end": [
        1.4845,
        3.7194
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
        1.4845,
        3.7194
      ],
      "end": [
        4.8777,
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
        5.0408,
        4.1762
      ],
      "end": [
        5.5628,
        4.1762
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
        1.2235,
        5.2936
      ],
      "end": [
        3.8336,
        5.2936
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
        3.8254,
        4.1599
      ],
      "end": [
        3.8254,
        5.4486
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
        4.3801,
        3.0506
      ],
      "end": [
        4.3801,
        3.6052
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
        4.6819,
        4.633
      ],
      "end": [
        4.6819,
        10.0
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
        5.1631,
        4.0457
      ],
      "end": [
        5.1631,
        4.6493
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
        8.491,
        3.9478
      ],
      "end": [
        8.491,
        5.3997
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
        8.491,
        8.385
      ],
      "end": [
        8.491,
        10.0
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
      "wallId": "wall_outer_12",
      "distance": 4.5092,
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
      "wallId": "wall_outer_12",
      "distance": 4.9592,
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
      "id": "room_living_room_1_split_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          4.9674000000000005,
          0.0816
        ],
        [
          9.8695,
          0.0816
        ],
        [
          9.8695,
          5.01635
        ],
        [
          4.9674000000000005,
          5.01635
        ]
      ],
      "expectedArea": 24.191,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0653,
          5.01635
        ],
        [
          4.9674000000000005,
          5.01635
        ],
        [
          4.9674000000000005,
          9.9511
        ],
        [
          0.0653,
          9.9511
        ]
      ],
      "expectedArea": 24.191,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          4.9674000000000005,
          5.01635
        ],
        [
          9.8695,
          5.01635
        ],
        [
          9.8695,
          9.9511
        ],
        [
          4.9674000000000005,
          9.9511
        ]
      ],
      "expectedArea": 24.191,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_1_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0653,
          0.0816
        ],
        [
          4.9674000000000005,
          0.0816
        ],
        [
          4.9674000000000005,
          2.548975
        ],
        [
          0.0653,
          2.548975
        ]
      ],
      "expectedArea": 12.095,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0653,
          2.548975
        ],
        [
          4.9674000000000005,
          2.548975
        ],
        [
          4.9674000000000005,
          5.01635
        ],
        [
          0.0653,
          5.01635
        ]
      ],
      "expectedArea": 12.095,
      "color": "#7fa79b"
    }
  ],
  "virtualBoundaries": [
    {
      "id": "virtual_boundary_1",
      "start": [
        0.0653,
        5.01635
      ],
      "end": [
        9.8695,
        5.01635
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_2",
      "start": [
        4.9674000000000005,
        0.0816
      ],
      "end": [
        4.9674000000000005,
        5.01635
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_3",
      "start": [
        4.9674000000000005,
        5.01635
      ],
      "end": [
        4.9674000000000005,
        9.9511
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_4",
      "start": [
        0.0653,
        2.548975
      ],
      "end": [
        4.9674000000000005,
        2.548975
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    }
  ]
};
