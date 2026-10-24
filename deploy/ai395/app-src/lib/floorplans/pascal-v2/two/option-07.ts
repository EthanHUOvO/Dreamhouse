import type { PascalV2Spec } from "../../types";

export const floorplan: PascalV2Spec = {
  "schema": "dreamhouse-pascal-floorplan/v2",
  "id": "two-option-07",
  "name": "两居方案7",
  "factory": "source-driven-pascal-v2",
  "sourceImage": "/preset/variants/two/option-07.png",
  "sourceImageDimensions": {
    "widthPx": 812,
    "heightPx": 792
  },
  "sourceCropPx": {
    "x": 86,
    "y": 229,
    "width": 642,
    "height": 356
  },
  "sourceDimensions": {
    "widthM": null,
    "depthM": null
  },
  "scale": {
    "pixelToMeterX": 0.01557632398753894,
    "pixelToMeterZ": 0.01557632398753894,
    "confidence": "low",
    "references": [
      "相对比例预览，绝对尺寸待核实"
    ]
  },
  "sourceOuterPolygonPx": [
    [
      86,
      229
    ],
    [
      418,
      229
    ],
    [
      417,
      277
    ],
    [
      728,
      277
    ],
    [
      728,
      405
    ],
    [
      666,
      405
    ],
    [
      666,
      585
    ],
    [
      86,
      585
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
      5.1713,
      0.0
    ],
    [
      5.1558,
      0.7477
    ],
    [
      10.0,
      0.7477
    ],
    [
      10.0,
      2.7414
    ],
    [
      9.0343,
      2.7414
    ],
    [
      9.0343,
      5.5452
    ],
    [
      0.0,
      5.5452
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
        5.1713,
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
        5.1713,
        0.0
      ],
      "end": [
        5.1558,
        0.7477
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
        5.1558,
        0.7477
      ],
      "end": [
        10.0,
        0.7477
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
        0.7477
      ],
      "end": [
        10.0,
        2.7414
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
        2.7414
      ],
      "end": [
        9.0343,
        2.7414
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
        9.0343,
        2.7414
      ],
      "end": [
        9.0343,
        5.5452
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
        9.0343,
        5.5452
      ],
      "end": [
        0.0,
        5.5452
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
        0.0,
        5.5452
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
        6.2461,
        2.6402
      ],
      "end": [
        10.0,
        2.6402
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
        1.1215,
        3.1542
      ],
      "end": [
        4.3146,
        3.1542
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
        1.1916,
        0.0
      ],
      "end": [
        1.1916,
        5.5452
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
        5.0701,
        3.0685
      ],
      "end": [
        5.0701,
        5.5452
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
        6.3162,
        3.3645
      ],
      "end": [
        6.3162,
        5.5452
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
      "wallId": "wall_partition_3",
      "distance": 4.338,
      "width": 0.9502,
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
      "wallId": "wall_outer_7",
      "distance": 4.5171,
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
      "id": "room_master_bedroom_2",
      "name": "主卧",
      "semantic": "master_bedroom",
      "polygon": [
        [
          0.0623,
          0.0623
        ],
        [
          1.1526,
          0.0623
        ],
        [
          1.1526,
          5.4984
        ],
        [
          0.0623,
          5.4984
        ]
      ],
      "expectedArea": 5.927,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          1.2305,
          2.78035
        ],
        [
          5.5919,
          2.78035
        ],
        [
          5.5919,
          5.4984
        ],
        [
          1.2305,
          5.4984
        ]
      ],
      "expectedArea": 11.855,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          5.5919,
          0.0623
        ],
        [
          9.9533,
          0.0623
        ],
        [
          9.9533,
          2.78035
        ],
        [
          5.5919,
          2.78035
        ]
      ],
      "expectedArea": 11.855,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          5.5919,
          2.78035
        ],
        [
          9.9533,
          2.78035
        ],
        [
          9.9533,
          5.4984
        ],
        [
          5.5919,
          5.4984
        ]
      ],
      "expectedArea": 11.855,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_1_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          1.2305,
          0.0623
        ],
        [
          3.4112,
          0.0623
        ],
        [
          3.4112,
          2.78035
        ],
        [
          1.2305,
          2.78035
        ]
      ],
      "expectedArea": 5.927,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          3.4112,
          0.0623
        ],
        [
          5.5919,
          0.0623
        ],
        [
          5.5919,
          2.78035
        ],
        [
          3.4112,
          2.78035
        ]
      ],
      "expectedArea": 5.927,
      "color": "#7fa79b"
    }
  ],
  "virtualBoundaries": [
    {
      "id": "virtual_boundary_1",
      "start": [
        5.5919,
        0.0623
      ],
      "end": [
        5.5919,
        5.4984
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_2",
      "start": [
        1.2305,
        2.78035
      ],
      "end": [
        5.5919,
        2.78035
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_3",
      "start": [
        5.5919,
        2.78035
      ],
      "end": [
        9.9533,
        2.78035
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_4",
      "start": [
        3.4112,
        0.0623
      ],
      "end": [
        3.4112,
        2.78035
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    }
  ]
};
