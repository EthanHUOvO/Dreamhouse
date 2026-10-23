import type { PascalV2Spec } from "../../types";

export const floorplan: PascalV2Spec = {
  "schema": "dreamhouse-pascal-floorplan/v2",
  "id": "three-option-01",
  "name": "三居方案1",
  "factory": "source-driven-pascal-v2",
  "sourceImage": "/preset/variants/three/option-01.png",
  "sourceImageDimensions": {
    "widthPx": 812,
    "heightPx": 792
  },
  "sourceCropPx": {
    "x": 87,
    "y": 159,
    "width": 640,
    "height": 496
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
      171,
      159
    ],
    [
      252,
      159
    ],
    [
      252,
      165
    ],
    [
      262,
      165
    ],
    [
      262,
      159
    ],
    [
      331,
      159
    ],
    [
      331,
      165
    ],
    [
      341,
      165
    ],
    [
      341,
      159
    ],
    [
      406,
      159
    ],
    [
      406,
      165
    ],
    [
      416,
      165
    ],
    [
      416,
      159
    ],
    [
      485,
      159
    ],
    [
      485,
      165
    ],
    [
      490,
      159
    ],
    [
      491,
      165
    ],
    [
      496,
      159
    ],
    [
      637,
      159
    ],
    [
      637,
      165
    ],
    [
      647,
      165
    ],
    [
      647,
      159
    ],
    [
      716,
      159
    ],
    [
      721,
      165
    ],
    [
      722,
      159
    ],
    [
      722,
      655
    ],
    [
      721,
      649
    ],
    [
      716,
      655
    ],
    [
      647,
      655
    ],
    [
      647,
      649
    ],
    [
      637,
      649
    ],
    [
      637,
      655
    ],
    [
      87,
      655
    ],
    [
      87,
      368
    ],
    [
      171,
      368
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
      1.3125,
      0.0
    ],
    [
      2.5781,
      0.0
    ],
    [
      2.5781,
      0.0938
    ],
    [
      2.7344,
      0.0938
    ],
    [
      2.7344,
      0.0
    ],
    [
      3.8125,
      0.0
    ],
    [
      3.8125,
      0.0938
    ],
    [
      3.9688,
      0.0938
    ],
    [
      3.9688,
      0.0
    ],
    [
      4.9844,
      0.0
    ],
    [
      4.9844,
      0.0938
    ],
    [
      5.1406,
      0.0938
    ],
    [
      5.1406,
      0.0
    ],
    [
      6.2188,
      0.0
    ],
    [
      6.2188,
      0.0938
    ],
    [
      6.2969,
      0.0
    ],
    [
      6.3125,
      0.0938
    ],
    [
      6.3906,
      0.0
    ],
    [
      8.5938,
      0.0
    ],
    [
      8.5938,
      0.0938
    ],
    [
      8.75,
      0.0938
    ],
    [
      8.75,
      0.0
    ],
    [
      9.8281,
      0.0
    ],
    [
      9.9062,
      0.0938
    ],
    [
      9.9219,
      0.0
    ],
    [
      9.9219,
      7.75
    ],
    [
      9.9062,
      7.6562
    ],
    [
      9.8281,
      7.75
    ],
    [
      8.75,
      7.75
    ],
    [
      8.75,
      7.6562
    ],
    [
      8.5938,
      7.6562
    ],
    [
      8.5938,
      7.75
    ],
    [
      0.0,
      7.75
    ],
    [
      0.0,
      3.2656
    ],
    [
      1.3125,
      3.2656
    ]
  ],
  "walls": [
    {
      "id": "wall_outer_1",
      "start": [
        1.3125,
        0.0
      ],
      "end": [
        2.5781,
        0.0
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
        2.5781,
        0.0938
      ],
      "end": [
        2.7344,
        0.0938
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
        2.7344,
        0.0
      ],
      "end": [
        3.8125,
        0.0
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
        3.8125,
        0.0938
      ],
      "end": [
        3.9688,
        0.0938
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
        3.9688,
        0.0
      ],
      "end": [
        4.9844,
        0.0
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
        4.9844,
        0.0938
      ],
      "end": [
        5.1406,
        0.0938
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
        5.1406,
        0.0
      ],
      "end": [
        6.2188,
        0.0
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
        6.3906,
        0.0
      ],
      "end": [
        8.5938,
        0.0
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
        8.5938,
        0.0938
      ],
      "end": [
        8.75,
        0.0938
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
        8.75,
        0.0
      ],
      "end": [
        9.8281,
        0.0
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
        9.9219,
        0.0
      ],
      "end": [
        9.9219,
        7.75
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
        9.8281,
        7.75
      ],
      "end": [
        8.75,
        7.75
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
        8.75,
        7.6562
      ],
      "end": [
        8.5938,
        7.6562
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
        8.5938,
        7.75
      ],
      "end": [
        0.0,
        7.75
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
        7.75
      ],
      "end": [
        0.0,
        3.2656
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
        0.0,
        3.2656
      ],
      "end": [
        1.3125,
        3.2656
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_35",
      "start": [
        1.3125,
        3.2656
      ],
      "end": [
        1.3125,
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
        8.2344,
        2.9297
      ],
      "end": [
        10.0,
        2.9297
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
        7.0312,
        4.5
      ],
      "end": [
        9.1719,
        4.5
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
        1.3125,
        4.5078
      ],
      "end": [
        2.0156,
        4.5078
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
        4.6875,
        4.5078
      ],
      "end": [
        5.5,
        4.5078
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
        1.9219,
        4.4219
      ],
      "end": [
        1.9219,
        7.75
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
        4.7578,
        0.0
      ],
      "end": [
        4.7578,
        7.75
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
      "distance": 1.7031,
      "width": 1.1562,
      "height": 2.1,
      "sourceEvidence": {
        "className": "door_opening",
        "confidence": "low"
      }
    },
    {
      "id": "door_interior_2",
      "name": "室内门（待确认）",
      "wallId": "wall_partition_6",
      "distance": 4.0,
      "width": 0.8125,
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
      "distance": 0.5391,
      "width": 0.7969,
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
      "wallId": "wall_outer_13",
      "distance": 0.5469,
      "width": 0.7813,
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
      "wallId": "wall_outer_22",
      "distance": 0.5469,
      "width": 0.7812,
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
      "wallId": "wall_outer_25",
      "distance": 0.9219,
      "width": 0.9062,
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
      "wallId": "wall_outer_25",
      "distance": 6.9531,
      "width": 0.9062,
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
      "wallId": "wall_outer_28",
      "distance": 0.5547,
      "width": 0.7969,
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
      "id": "room_living_room_1_split_1_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          4.7969,
          0.0625
        ],
        [
          7.33595,
          0.0625
        ],
        [
          7.33595,
          3.8828
        ],
        [
          4.7969,
          3.8828
        ]
      ],
      "expectedArea": 9.7,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          7.33595,
          0.0625
        ],
        [
          9.875,
          0.0625
        ],
        [
          9.875,
          3.8828
        ],
        [
          7.33595,
          3.8828
        ]
      ],
      "expectedArea": 9.7,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          4.7969,
          3.8828
        ],
        [
          7.33595,
          3.8828
        ],
        [
          7.33595,
          7.7031
        ],
        [
          4.7969,
          7.7031
        ]
      ],
      "expectedArea": 9.7,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          7.33595,
          3.8828
        ],
        [
          9.875,
          3.8828
        ],
        [
          9.875,
          7.7031
        ],
        [
          7.33595,
          7.7031
        ]
      ],
      "expectedArea": 9.7,
      "color": "#7fa79b"
    },
    {
      "id": "room_master_bedroom_2_split_1_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0625,
          0.0625
        ],
        [
          2.39065,
          0.0625
        ],
        [
          2.39065,
          3.8828
        ],
        [
          0.0625,
          3.8828
        ]
      ],
      "expectedArea": 8.894,
      "color": "#7fa79b"
    },
    {
      "id": "room_master_bedroom_2_split_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          2.39065,
          0.0625
        ],
        [
          4.7188,
          0.0625
        ],
        [
          4.7188,
          3.8828
        ],
        [
          2.39065,
          3.8828
        ]
      ],
      "expectedArea": 8.894,
      "color": "#7fa79b"
    },
    {
      "id": "room_master_bedroom_2_split_2_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0625,
          3.8828
        ],
        [
          2.39065,
          3.8828
        ],
        [
          2.39065,
          7.7031
        ],
        [
          0.0625,
          7.7031
        ]
      ],
      "expectedArea": 8.894,
      "color": "#7fa79b"
    },
    {
      "id": "room_master_bedroom_2_split_2_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          2.39065,
          3.8828
        ],
        [
          4.7188,
          3.8828
        ],
        [
          4.7188,
          7.7031
        ],
        [
          2.39065,
          7.7031
        ]
      ],
      "expectedArea": 8.894,
      "color": "#7fa79b"
    }
  ],
  "virtualBoundaries": [
    {
      "id": "virtual_boundary_1",
      "start": [
        4.7969,
        3.8828
      ],
      "end": [
        9.875,
        3.8828
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_2",
      "start": [
        0.0625,
        3.8828
      ],
      "end": [
        4.7188,
        3.8828
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_3",
      "start": [
        7.33595,
        0.0625
      ],
      "end": [
        7.33595,
        3.8828
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_4",
      "start": [
        7.33595,
        3.8828
      ],
      "end": [
        7.33595,
        7.7031
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_5",
      "start": [
        2.39065,
        0.0625
      ],
      "end": [
        2.39065,
        3.8828
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_6",
      "start": [
        2.39065,
        3.8828
      ],
      "end": [
        2.39065,
        7.7031
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    }
  ]
};
