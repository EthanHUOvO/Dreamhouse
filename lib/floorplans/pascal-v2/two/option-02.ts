import type { PascalV2Spec } from "../../types";

export const floorplan: PascalV2Spec = {
  "schema": "dreamhouse-pascal-floorplan/v2",
  "id": "two-option-02",
  "name": "两居方案2",
  "factory": "source-driven-pascal-v2",
  "sourceImage": "/preset/variants/two/option-02.png",
  "sourceImageDimensions": {
    "widthPx": 812,
    "heightPx": 792
  },
  "sourceCropPx": {
    "x": 221,
    "y": 98,
    "width": 372,
    "height": 618
  },
  "sourceDimensions": {
    "widthM": null,
    "depthM": null
  },
  "scale": {
    "pixelToMeterX": 0.016181229773462782,
    "pixelToMeterZ": 0.016181229773462782,
    "confidence": "low",
    "references": [
      "相对比例预览，绝对尺寸待核实"
    ]
  },
  "sourceOuterPolygonPx": [
    [
      221,
      98
    ],
    [
      416,
      98
    ],
    [
      416,
      201
    ],
    [
      519,
      201
    ],
    [
      519,
      320
    ],
    [
      593,
      320
    ],
    [
      593,
      716
    ],
    [
      402,
      716
    ],
    [
      402,
      639
    ],
    [
      221,
      639
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
      3.1553,
      0.0
    ],
    [
      3.1553,
      1.6667
    ],
    [
      4.822,
      1.6667
    ],
    [
      4.822,
      3.5922
    ],
    [
      6.0194,
      3.5922
    ],
    [
      6.0194,
      10.0
    ],
    [
      2.9288,
      10.0
    ],
    [
      2.9288,
      8.754
    ],
    [
      0.0,
      8.754
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
        3.1553,
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
        3.1553,
        0.0
      ],
      "end": [
        3.1553,
        1.6667
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
        3.1553,
        1.6667
      ],
      "end": [
        4.822,
        1.6667
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
        4.822,
        1.6667
      ],
      "end": [
        4.822,
        3.5922
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
        4.822,
        3.5922
      ],
      "end": [
        6.0194,
        3.5922
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
        6.0194,
        3.5922
      ],
      "end": [
        6.0194,
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
        6.0194,
        10.0
      ],
      "end": [
        2.9288,
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
        2.9288,
        10.0
      ],
      "end": [
        2.9288,
        8.754
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
        2.9288,
        8.754
      ],
      "end": [
        0.0,
        8.754
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
        8.754
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
        3.7136
      ],
      "end": [
        6.0194,
        3.7136
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
        5.8091
      ],
      "end": [
        2.0712,
        5.8091
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
        3.034,
        3.0097
      ],
      "end": [
        3.034,
        8.9644
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
      "distance": 2.5162,
      "width": 0.8576,
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
      "distance": 0.6877,
      "width": 0.4369,
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
      "id": "room_living_room_1_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          2.9935,
          3.754
        ],
        [
          5.9709,
          3.754
        ],
        [
          5.9709,
          6.8527499999999995
        ],
        [
          2.9935,
          6.8527499999999995
        ]
      ],
      "expectedArea": 9.226,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          2.9935,
          6.8527499999999995
        ],
        [
          5.9709,
          6.8527499999999995
        ],
        [
          5.9709,
          9.9515
        ],
        [
          2.9935,
          9.9515
        ]
      ],
      "expectedArea": 9.226,
      "color": "#7fa79b"
    },
    {
      "id": "room_master_bedroom_2_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0647,
          3.754
        ],
        [
          2.9935,
          3.754
        ],
        [
          2.9935,
          6.254
        ],
        [
          0.0647,
          6.254
        ]
      ],
      "expectedArea": 7.322,
      "color": "#7fa79b"
    },
    {
      "id": "room_master_bedroom_2_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0647,
          6.254
        ],
        [
          2.9935,
          6.254
        ],
        [
          2.9935,
          8.754
        ],
        [
          0.0647,
          8.754
        ]
      ],
      "expectedArea": 7.322,
      "color": "#7fa79b"
    },
    {
      "id": "room_bedroom_3_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0647,
          0.0647
        ],
        [
          3.0178000000000003,
          0.0647
        ],
        [
          3.0178000000000003,
          3.6731
        ],
        [
          0.0647,
          3.6731
        ]
      ],
      "expectedArea": 10.656,
      "color": "#7fa79b"
    },
    {
      "id": "room_bedroom_3_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          3.0178000000000003,
          0.0647
        ],
        [
          5.9709,
          0.0647
        ],
        [
          5.9709,
          3.6731
        ],
        [
          3.0178000000000003,
          3.6731
        ]
      ],
      "expectedArea": 10.656,
      "color": "#7fa79b"
    }
  ],
  "virtualBoundaries": [
    {
      "id": "virtual_boundary_1",
      "start": [
        2.9935,
        6.8527499999999995
      ],
      "end": [
        5.9709,
        6.8527499999999995
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_2",
      "start": [
        0.0647,
        6.254
      ],
      "end": [
        2.9935,
        6.254
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_3",
      "start": [
        3.0178000000000003,
        0.0647
      ],
      "end": [
        3.0178000000000003,
        3.6731
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    }
  ]
};
