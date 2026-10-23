import type { PascalV2Spec } from "../../types";

export const floorplan: PascalV2Spec = {
  "schema": "dreamhouse-pascal-floorplan/v2",
  "id": "one-option-02",
  "name": "一居方案2",
  "factory": "source-driven-pascal-v2",
  "sourceImage": "/preset/variants/one/option-02.png",
  "sourceImageDimensions": {
    "widthPx": 812,
    "heightPx": 792
  },
  "sourceCropPx": {
    "x": 91,
    "y": 284,
    "width": 632,
    "height": 247
  },
  "sourceDimensions": {
    "widthM": null,
    "depthM": null
  },
  "scale": {
    "pixelToMeterX": 0.015822784810126583,
    "pixelToMeterZ": 0.015822784810126583,
    "confidence": "low",
    "references": [
      "相对比例预览，绝对尺寸待核实"
    ]
  },
  "sourceOuterPolygonPx": [
    [
      91,
      284
    ],
    [
      647,
      284
    ],
    [
      647,
      363
    ],
    [
      723,
      363
    ],
    [
      723,
      531
    ],
    [
      91,
      531
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
      8.7975,
      0.0
    ],
    [
      8.7975,
      1.25
    ],
    [
      10.0,
      1.25
    ],
    [
      10.0,
      3.9082
    ],
    [
      0.0,
      3.9082
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
        8.7975,
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
        8.7975,
        0.0
      ],
      "end": [
        8.7975,
        1.25
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
        8.7975,
        1.25
      ],
      "end": [
        10.0,
        1.25
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
        1.25
      ],
      "end": [
        10.0,
        3.9082
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
        3.9082
      ],
      "end": [
        0.0,
        3.9082
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
        0.0,
        3.9082
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
        3.8291,
        2.6424
      ],
      "end": [
        5.807,
        2.6424
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
        1.25,
        0.0
      ],
      "end": [
        1.25,
        2.4842
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
        3.8845,
        0.0
      ],
      "end": [
        3.8845,
        3.8924
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
        8.6867,
        3.3386
      ],
      "end": [
        8.6867,
        3.9082
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
      "wallId": "wall_outer_5",
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
      "wallId": "wall_outer_1",
      "distance": 4.8734,
      "width": 0.443,
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
      "wallId": "wall_outer_4",
      "distance": 1.3212,
      "width": 1.4082,
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
      "wallId": "wall_outer_6",
      "distance": 0.7753,
      "width": 0.5063,
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
      "id": "room_living_room_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          6.9383,
          0.0633
        ],
        [
          9.9525,
          0.0633
        ],
        [
          9.9525,
          3.8608
        ],
        [
          6.9383,
          3.8608
        ]
      ],
      "expectedArea": 11.446,
      "color": "#7fa79b"
    },
    {
      "id": "room_master_bedroom_2_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0633,
          0.0633
        ],
        [
          3.8449,
          0.0633
        ],
        [
          3.8449,
          1.9620499999999998
        ],
        [
          0.0633,
          1.9620499999999998
        ]
      ],
      "expectedArea": 7.18,
      "color": "#7fa79b"
    },
    {
      "id": "room_master_bedroom_2_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0633,
          1.9620499999999998
        ],
        [
          3.8449,
          1.9620499999999998
        ],
        [
          3.8449,
          3.8608
        ],
        [
          0.0633,
          3.8608
        ]
      ],
      "expectedArea": 7.18,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          3.9241,
          0.0633
        ],
        [
          6.9383,
          0.0633
        ],
        [
          6.9383,
          1.9620499999999998
        ],
        [
          3.9241,
          1.9620499999999998
        ]
      ],
      "expectedArea": 5.723,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          3.9241,
          1.9620499999999998
        ],
        [
          6.9383,
          1.9620499999999998
        ],
        [
          6.9383,
          3.8608
        ],
        [
          3.9241,
          3.8608
        ]
      ],
      "expectedArea": 5.723,
      "color": "#7fa79b"
    }
  ],
  "virtualBoundaries": [
    {
      "id": "virtual_boundary_1",
      "start": [
        6.9383,
        0.0633
      ],
      "end": [
        6.9383,
        3.8608
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_2",
      "start": [
        0.0633,
        1.9620499999999998
      ],
      "end": [
        3.8449,
        1.9620499999999998
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_3",
      "start": [
        3.9241,
        1.9620499999999998
      ],
      "end": [
        6.9383,
        1.9620499999999998
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    }
  ]
};
