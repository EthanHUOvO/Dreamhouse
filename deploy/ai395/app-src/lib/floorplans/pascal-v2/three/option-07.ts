import type { PascalV2Spec } from "../../types";

export const floorplan: PascalV2Spec = {
  "schema": "dreamhouse-pascal-floorplan/v2",
  "id": "three-option-07",
  "name": "三居方案7",
  "factory": "source-driven-pascal-v2",
  "sourceImage": "/preset/variants/three/option-07.png",
  "sourceImageDimensions": {
    "widthPx": 812,
    "heightPx": 792
  },
  "sourceCropPx": {
    "x": 87,
    "y": 122,
    "width": 640,
    "height": 570
  },
  "sourceDimensions": {
    "widthM": null,
    "depthM": null
  },
  "scale": {
    "pixelToMeterX": 0.015625,
    "pixelToMeterZ": 0.015625,
    "confidence": "low",
    "references": [
      "相对比例预览，绝对尺寸待核实"
    ]
  },
  "sourceOuterPolygonPx": [
    [
      87,
      122
    ],
    [
      704,
      122
    ],
    [
      704,
      303
    ],
    [
      727,
      303
    ],
    [
      727,
      625
    ],
    [
      535,
      625
    ],
    [
      534,
      542
    ],
    [
      449,
      542
    ],
    [
      447,
      615
    ],
    [
      316,
      615
    ],
    [
      316,
      692
    ],
    [
      157,
      692
    ],
    [
      157,
      542
    ],
    [
      87,
      543
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
      9.6406,
      0.0
    ],
    [
      9.6406,
      2.8281
    ],
    [
      10.0,
      2.8281
    ],
    [
      10.0,
      7.8594
    ],
    [
      7.0,
      7.8594
    ],
    [
      6.9844,
      6.5625
    ],
    [
      5.6562,
      6.5625
    ],
    [
      5.625,
      7.7031
    ],
    [
      3.5781,
      7.7031
    ],
    [
      3.5781,
      8.9062
    ],
    [
      1.0938,
      8.9062
    ],
    [
      1.0938,
      6.5625
    ],
    [
      0.0,
      6.5781
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
        9.6406,
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
        9.6406,
        0.0
      ],
      "end": [
        9.6406,
        2.8281
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
        9.6406,
        2.8281
      ],
      "end": [
        10.0,
        2.8281
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
        2.8281
      ],
      "end": [
        10.0,
        7.8594
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
        7.8594
      ],
      "end": [
        7.0,
        7.8594
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
        7.0,
        7.8594
      ],
      "end": [
        6.9844,
        6.5625
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
        6.9844,
        6.5625
      ],
      "end": [
        5.6562,
        6.5625
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
        5.6562,
        6.5625
      ],
      "end": [
        5.625,
        7.7031
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
        5.625,
        7.7031
      ],
      "end": [
        3.5781,
        7.7031
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
        3.5781,
        7.7031
      ],
      "end": [
        3.5781,
        8.9062
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
        3.5781,
        8.9062
      ],
      "end": [
        1.0938,
        8.9062
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
        1.0938,
        8.9062
      ],
      "end": [
        1.0938,
        6.5625
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
        1.0938,
        6.5625
      ],
      "end": [
        0.0,
        6.5781
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
        6.5781
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
        3.9219,
        1.8594
      ],
      "end": [
        5.3906,
        1.8594
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
        5.25,
        2.8984
      ],
      "end": [
        10.0,
        2.8984
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
        2.9141
      ],
      "end": [
        4.0938,
        2.9141
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
        7.0,
        5.9922
      ],
      "end": [
        10.0,
        5.9922
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
        6.4688
      ],
      "end": [
        7.1562,
        6.4688
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
        1.1641,
        2.8438
      ],
      "end": [
        1.1641,
        8.9062
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
        3.2812,
        0.0
      ],
      "end": [
        3.2812,
        1.9375
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
        4.875,
        0.0
      ],
      "end": [
        4.875,
        1.9531
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
        8.3047,
        0.0
      ],
      "end": [
        8.3047,
        7.8594
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
      "wallId": "wall_partition_5",
      "distance": 4.9609,
      "width": 1.0156,
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
      "distance": 0.4845,
      "width": 0.5002,
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
          1.2031,
          6.5156
        ],
        [
          5.6562,
          6.5156
        ],
        [
          5.5781,
          7.6562
        ],
        [
          3.5781,
          7.6562
        ],
        [
          3.5312,
          8.8594
        ],
        [
          1.2031,
          8.8594
        ]
      ],
      "expectedArea": 7.864,
      "color": "#7fa79b"
    },
    {
      "id": "room_bedroom_3",
      "name": "次卧",
      "semantic": "bedroom",
      "polygon": [
        [
          8.3438,
          2.9375
        ],
        [
          9.9531,
          2.9375
        ],
        [
          9.9531,
          5.9531
        ],
        [
          8.3438,
          5.9531
        ]
      ],
      "expectedArea": 4.853,
      "color": "#7fa79b"
    },
    {
      "id": "room_bedroom_4",
      "name": "次卧2",
      "semantic": "bedroom",
      "polygon": [
        [
          0.0625,
          2.9531
        ],
        [
          1.125,
          2.9531
        ],
        [
          1.125,
          6.4375
        ],
        [
          0.0625,
          6.4375
        ]
      ],
      "expectedArea": 3.702,
      "color": "#7fa79b"
    },
    {
      "id": "room_kitchen_5",
      "name": "厨房",
      "semantic": "kitchen",
      "polygon": [
        [
          8.3438,
          0.0625
        ],
        [
          9.5938,
          0.0625
        ],
        [
          9.6406,
          2.8594
        ],
        [
          8.3438,
          2.8594
        ]
      ],
      "expectedArea": 3.562,
      "color": "#7fa79b"
    },
    {
      "id": "room_bathroom_6",
      "name": "卫生间",
      "semantic": "bathroom",
      "polygon": [
        [
          8.3438,
          6.0312
        ],
        [
          9.9531,
          6.0312
        ],
        [
          9.9531,
          7.8125
        ],
        [
          8.3438,
          7.8125
        ]
      ],
      "expectedArea": 2.867,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          4.16405,
          0.0625
        ],
        [
          8.2656,
          0.0625
        ],
        [
          8.2656,
          7.8125
        ],
        [
          4.16405,
          7.8125
        ]
      ],
      "expectedArea": 31.787,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0625,
          0.0625
        ],
        [
          4.16405,
          0.0625
        ],
        [
          4.16405,
          3.9375
        ],
        [
          0.0625,
          3.9375
        ]
      ],
      "expectedArea": 15.894,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0625,
          3.9375
        ],
        [
          4.16405,
          3.9375
        ],
        [
          4.16405,
          7.8125
        ],
        [
          0.0625,
          7.8125
        ]
      ],
      "expectedArea": 15.894,
      "color": "#7fa79b"
    }
  ],
  "virtualBoundaries": [
    {
      "id": "virtual_boundary_1",
      "start": [
        4.16405,
        0.0625
      ],
      "end": [
        4.16405,
        7.8125
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_2",
      "start": [
        0.0625,
        3.9375
      ],
      "end": [
        4.16405,
        3.9375
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    }
  ]
};
