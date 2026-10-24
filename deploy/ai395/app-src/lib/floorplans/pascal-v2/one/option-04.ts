import type { PascalV2Spec } from "../../types";

export const floorplan: PascalV2Spec = {
  "schema": "dreamhouse-pascal-floorplan/v2",
  "id": "one-option-04",
  "name": "一居方案4",
  "factory": "source-driven-pascal-v2",
  "sourceImage": "/preset/variants/one/option-04.png",
  "sourceImageDimensions": {
    "widthPx": 812,
    "heightPx": 792
  },
  "sourceCropPx": {
    "x": 183,
    "y": 99,
    "width": 448,
    "height": 616
  },
  "sourceDimensions": {
    "widthM": null,
    "depthM": null
  },
  "scale": {
    "pixelToMeterX": 0.016233766233766232,
    "pixelToMeterZ": 0.016233766233766232,
    "confidence": "low",
    "references": [
      "相对比例预览，绝对尺寸待核实"
    ]
  },
  "sourceOuterPolygonPx": [
    [
      183,
      99
    ],
    [
      305,
      99
    ],
    [
      305,
      117
    ],
    [
      548,
      117
    ],
    [
      548,
      240
    ],
    [
      631,
      239
    ],
    [
      631,
      715
    ],
    [
      290,
      715
    ],
    [
      290,
      319
    ],
    [
      183,
      319
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
      1.9805,
      0.0
    ],
    [
      1.9805,
      0.2922
    ],
    [
      5.9253,
      0.2922
    ],
    [
      5.9253,
      2.289
    ],
    [
      7.2727,
      2.2727
    ],
    [
      7.2727,
      10.0
    ],
    [
      1.737,
      10.0
    ],
    [
      1.737,
      3.5714
    ],
    [
      0.0,
      3.5714
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
        1.9805,
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
        1.9805,
        0.0
      ],
      "end": [
        1.9805,
        0.2922
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
        1.9805,
        0.2922
      ],
      "end": [
        5.9253,
        0.2922
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
        5.9253,
        0.2922
      ],
      "end": [
        5.9253,
        2.289
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
        5.9253,
        2.289
      ],
      "end": [
        7.2727,
        2.2727
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
        7.2727,
        2.2727
      ],
      "end": [
        7.2727,
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
        7.2727,
        10.0
      ],
      "end": [
        1.737,
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
        1.737,
        10.0
      ],
      "end": [
        1.737,
        3.5714
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
        1.737,
        3.5714
      ],
      "end": [
        0.0,
        3.5714
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
        3.5714
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
        3.7662,
        2.4107
      ],
      "end": [
        6.3474,
        2.4107
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
        3.4334
      ],
      "end": [
        4.2857,
        3.4334
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
        1.737,
        6.6071
      ],
      "end": [
        6.0065,
        6.6071
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
        3.8799,
        0.3084
      ],
      "end": [
        3.8799,
        2.5487
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
        5.8117,
        0.3084
      ],
      "end": [
        5.8117,
        6.737
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
      "wallId": "wall_outer_6",
      "distance": 3.4136,
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
      "wallId": "wall_outer_5",
      "distance": 0.763,
      "width": 0.4221,
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
      "wallId": "wall_outer_10",
      "distance": 1.599,
      "width": 1.8019,
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
      "id": "room_kitchen_3",
      "name": "厨房",
      "semantic": "kitchen",
      "polygon": [
        [
          3.9286,
          0.3571
        ],
        [
          5.7792,
          0.3571
        ],
        [
          5.7792,
          2.3701
        ],
        [
          3.9286,
          2.3701
        ]
      ],
      "expectedArea": 3.725,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0649,
          0.0649
        ],
        [
          5.7792,
          0.0649
        ],
        [
          5.7792,
          3.3198
        ],
        [
          0.0649,
          3.3198
        ]
      ],
      "expectedArea": 18.599,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0649,
          3.3198
        ],
        [
          5.7792,
          3.3198
        ],
        [
          5.7792,
          6.5747
        ],
        [
          0.0649,
          6.5747
        ]
      ],
      "expectedArea": 18.599,
      "color": "#7fa79b"
    },
    {
      "id": "room_master_bedroom_2_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          1.8019,
          0.3571
        ],
        [
          7.224,
          0.3571
        ],
        [
          7.224,
          5.1541999999999994
        ],
        [
          1.8019,
          5.1541999999999994
        ]
      ],
      "expectedArea": 26.01,
      "color": "#7fa79b"
    },
    {
      "id": "room_master_bedroom_2_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          1.8019,
          5.1541999999999994
        ],
        [
          7.224,
          5.1541999999999994
        ],
        [
          7.224,
          9.9513
        ],
        [
          1.8019,
          9.9513
        ]
      ],
      "expectedArea": 26.01,
      "color": "#7fa79b"
    }
  ],
  "virtualBoundaries": [
    {
      "id": "virtual_boundary_1",
      "start": [
        0.0649,
        3.3198
      ],
      "end": [
        5.7792,
        3.3198
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_2",
      "start": [
        1.8019,
        5.1541999999999994
      ],
      "end": [
        7.224,
        5.1541999999999994
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    }
  ]
};
