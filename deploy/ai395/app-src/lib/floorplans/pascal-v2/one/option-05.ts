import type { PascalV2Spec } from "../../types";

export const floorplan: PascalV2Spec = {
  "schema": "dreamhouse-pascal-floorplan/v2",
  "id": "one-option-05",
  "name": "一居方案5",
  "factory": "source-driven-pascal-v2",
  "sourceImage": "/preset/variants/one/option-05.png",
  "sourceImageDimensions": {
    "widthPx": 812,
    "heightPx": 792
  },
  "sourceCropPx": {
    "x": 192,
    "y": 102,
    "width": 430,
    "height": 611
  },
  "sourceDimensions": {
    "widthM": null,
    "depthM": null
  },
  "scale": {
    "pixelToMeterX": 0.016366612111292964,
    "pixelToMeterZ": 0.016366612111292964,
    "confidence": "low",
    "references": [
      "相对比例预览，绝对尺寸待核实"
    ]
  },
  "sourceOuterPolygonPx": [
    [
      192,
      102
    ],
    [
      234,
      102
    ],
    [
      233,
      109
    ],
    [
      420,
      102
    ],
    [
      420,
      277
    ],
    [
      622,
      276
    ],
    [
      622,
      671
    ],
    [
      572,
      671
    ],
    [
      572,
      713
    ],
    [
      192,
      713
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
      0.6874,
      0.0
    ],
    [
      0.671,
      0.1146
    ],
    [
      3.7316,
      0.0
    ],
    [
      3.7316,
      2.8642
    ],
    [
      7.0376,
      2.8478
    ],
    [
      7.0376,
      9.3126
    ],
    [
      6.2193,
      9.3126
    ],
    [
      6.2193,
      10.0
    ],
    [
      0.0,
      10.0
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
        0.6874,
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
        0.671,
        0.1146
      ],
      "end": [
        3.7316,
        0.0
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
        3.7316,
        0.0
      ],
      "end": [
        3.7316,
        2.8642
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
        3.7316,
        2.8642
      ],
      "end": [
        7.0376,
        2.8478
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
        7.0376,
        2.8478
      ],
      "end": [
        7.0376,
        9.3126
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
        7.0376,
        9.3126
      ],
      "end": [
        6.2193,
        9.3126
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
        6.2193,
        9.3126
      ],
      "end": [
        6.2193,
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
        6.2193,
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
      "id": "wall_outer_10",
      "start": [
        0.0,
        10.0
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
        1.8658,
        3.6088
      ],
      "end": [
        3.7316,
        3.6088
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
        8.1342
      ],
      "end": [
        3.7152,
        8.1342
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
        3.5025,
        9.1817
      ],
      "end": [
        4.239,
        9.1817
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
        1.9149,
        0.0
      ],
      "end": [
        1.9149,
        3.7316
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
        3.6088,
        4.9264
      ],
      "end": [
        3.6088,
        9.9836
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
      "wallId": "wall_outer_10",
      "distance": 4.55,
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
      "wallId": "wall_outer_10",
      "distance": 5.0,
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
          0.0655,
          8.1833
        ],
        [
          3.5679,
          8.1833
        ],
        [
          3.5679,
          9.9509
        ],
        [
          0.0655,
          9.9509
        ]
      ],
      "expectedArea": 6.191,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0655,
          0.0655
        ],
        [
          3.527,
          0.0655
        ],
        [
          3.527,
          5.0082
        ],
        [
          0.0655,
          5.0082
        ]
      ],
      "expectedArea": 17.109,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          3.527,
          0.0655
        ],
        [
          6.9885,
          0.0655
        ],
        [
          6.9885,
          5.0082
        ],
        [
          3.527,
          5.0082
        ]
      ],
      "expectedArea": 17.109,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0655,
          5.0082
        ],
        [
          3.527,
          5.0082
        ],
        [
          3.527,
          9.9509
        ],
        [
          0.0655,
          9.9509
        ]
      ],
      "expectedArea": 17.109,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          3.527,
          5.0082
        ],
        [
          6.9885,
          5.0082
        ],
        [
          6.9885,
          9.9509
        ],
        [
          3.527,
          9.9509
        ]
      ],
      "expectedArea": 17.109,
      "color": "#7fa79b"
    }
  ],
  "virtualBoundaries": [
    {
      "id": "virtual_boundary_1",
      "start": [
        0.0655,
        5.0082
      ],
      "end": [
        6.9885,
        5.0082
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_2",
      "start": [
        3.527,
        0.0655
      ],
      "end": [
        3.527,
        5.0082
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_3",
      "start": [
        3.527,
        5.0082
      ],
      "end": [
        3.527,
        9.9509
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    }
  ]
};
