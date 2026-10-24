import type { PascalV2Spec } from "../../types";

export const floorplan: PascalV2Spec = {
  "schema": "dreamhouse-pascal-floorplan/v2",
  "id": "one-option-06",
  "name": "一居方案6",
  "factory": "source-driven-pascal-v2",
  "sourceImage": "/preset/variants/one/option-06.png",
  "sourceImageDimensions": {
    "widthPx": 812,
    "heightPx": 792
  },
  "sourceCropPx": {
    "x": 137,
    "y": 100,
    "width": 540,
    "height": 614
  },
  "sourceDimensions": {
    "widthM": null,
    "depthM": null
  },
  "scale": {
    "pixelToMeterX": 0.016286644951140065,
    "pixelToMeterZ": 0.016286644951140065,
    "confidence": "low",
    "references": [
      "相对比例预览，绝对尺寸待核实"
    ]
  },
  "sourceOuterPolygonPx": [
    [
      137,
      100
    ],
    [
      357,
      100
    ],
    [
      358,
      188
    ],
    [
      468,
      188
    ],
    [
      469,
      100
    ],
    [
      677,
      100
    ],
    [
      677,
      547
    ],
    [
      596,
      546
    ],
    [
      596,
      714
    ],
    [
      469,
      714
    ],
    [
      468,
      546
    ],
    [
      340,
      546
    ],
    [
      340,
      714
    ],
    [
      215,
      714
    ],
    [
      215,
      546
    ],
    [
      137,
      547
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
      3.5831,
      0.0
    ],
    [
      3.5993,
      1.4332
    ],
    [
      5.3909,
      1.4332
    ],
    [
      5.4072,
      0.0
    ],
    [
      8.7948,
      0.0
    ],
    [
      8.7948,
      7.2801
    ],
    [
      7.4756,
      7.2638
    ],
    [
      7.4756,
      10.0
    ],
    [
      5.4072,
      10.0
    ],
    [
      5.3909,
      7.2638
    ],
    [
      3.3062,
      7.2638
    ],
    [
      3.3062,
      10.0
    ],
    [
      1.2704,
      10.0
    ],
    [
      1.2704,
      7.2638
    ],
    [
      0.0,
      7.2801
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
        3.5831,
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
        3.5831,
        0.0
      ],
      "end": [
        3.5993,
        1.4332
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
        3.5993,
        1.4332
      ],
      "end": [
        5.3909,
        1.4332
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
        5.3909,
        1.4332
      ],
      "end": [
        5.4072,
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
        5.4072,
        0.0
      ],
      "end": [
        8.7948,
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
        8.7948,
        0.0
      ],
      "end": [
        8.7948,
        7.2801
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
        8.7948,
        7.2801
      ],
      "end": [
        7.4756,
        7.2638
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
        7.4756,
        7.2638
      ],
      "end": [
        7.4756,
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
        7.4756,
        10.0
      ],
      "end": [
        5.4072,
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
        5.4072,
        10.0
      ],
      "end": [
        5.3909,
        7.2638
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
        5.3909,
        7.2638
      ],
      "end": [
        3.3062,
        7.2638
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
        3.3062,
        7.2638
      ],
      "end": [
        3.3062,
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
        3.3062,
        10.0
      ],
      "end": [
        1.2704,
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
        1.2704,
        10.0
      ],
      "end": [
        1.2704,
        7.2638
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
        1.2704,
        7.2638
      ],
      "end": [
        0.0,
        7.2801
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
        7.2801
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
        7.9479,
        1.5472
      ],
      "end": [
        8.7948,
        1.5472
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
        1.5554
      ],
      "end": [
        0.8795,
        1.5554
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
        4.4625,
        4.5033
      ],
      "end": [
        5.6352,
        4.5033
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
        5.4072,
        9.0717
      ],
      "end": [
        5.9935,
        9.0717
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
        3.4609,
        1.4332
      ],
      "end": [
        3.4609,
        4.5928
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
        5.513,
        1.4169
      ],
      "end": [
        5.513,
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
      "id": "door_interior_1",
      "name": "室内门（待确认）",
      "wallId": "wall_partition_6",
      "distance": 5.0326,
      "width": 0.8469,
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
      "distance": 0.8551,
      "width": 0.8307,
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
      "distance": 0.9772,
      "width": 0.7818,
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
      "wallId": "wall_outer_4",
      "distance": 0.5945,
      "width": 0.8307,
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
          4.4055,
          0.0651
        ],
        [
          8.7459,
          0.0651
        ],
        [
          8.7459,
          5.0081
        ],
        [
          4.4055,
          5.0081
        ]
      ],
      "expectedArea": 21.455,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0651,
          5.0081
        ],
        [
          4.4055,
          5.0081
        ],
        [
          4.4055,
          9.9511
        ],
        [
          0.0651,
          9.9511
        ]
      ],
      "expectedArea": 21.455,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          4.4055,
          5.0081
        ],
        [
          8.7459,
          5.0081
        ],
        [
          8.7459,
          9.9511
        ],
        [
          4.4055,
          9.9511
        ]
      ],
      "expectedArea": 21.455,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_1_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0651,
          0.0651
        ],
        [
          4.4055,
          0.0651
        ],
        [
          4.4055,
          2.5366
        ],
        [
          0.0651,
          2.5366
        ]
      ],
      "expectedArea": 10.727,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0651,
          2.5366
        ],
        [
          4.4055,
          2.5366
        ],
        [
          4.4055,
          5.0081
        ],
        [
          0.0651,
          5.0081
        ]
      ],
      "expectedArea": 10.727,
      "color": "#7fa79b"
    }
  ],
  "virtualBoundaries": [
    {
      "id": "virtual_boundary_1",
      "start": [
        0.0651,
        5.0081
      ],
      "end": [
        8.7459,
        5.0081
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_2",
      "start": [
        4.4055,
        0.0651
      ],
      "end": [
        4.4055,
        5.0081
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_3",
      "start": [
        4.4055,
        5.0081
      ],
      "end": [
        4.4055,
        9.9511
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_4",
      "start": [
        0.0651,
        2.5366
      ],
      "end": [
        4.4055,
        2.5366
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    }
  ]
};
