import type { PascalV2Spec } from "../../types";

export const floorplan: PascalV2Spec = {
  "schema": "dreamhouse-pascal-floorplan/v2",
  "id": "one-option-01",
  "name": "一居方案1",
  "factory": "source-driven-pascal-v2",
  "sourceImage": "/preset/variants/one/option-01.png",
  "sourceImageDimensions": {
    "widthPx": 748,
    "heightPx": 718
  },
  "sourceCropPx": {
    "x": 172,
    "y": 88,
    "width": 402,
    "height": 560
  },
  "sourceDimensions": {
    "widthM": 6.63,
    "depthM": 8.379
  },
  "scale": {
    "pixelToMeterX": 0.016492537313432837,
    "pixelToMeterZ": 0.014962499999999998,
    "confidence": "medium",
    "references": [
      "原图外部尺寸标注"
    ]
  },
  "sourceOuterPolygonPx": [
    [
      172,
      88
    ],
    [
      302,
      88
    ],
    [
      302,
      151
    ],
    [
      317,
      151
    ],
    [
      317,
      108
    ],
    [
      327,
      108
    ],
    [
      318,
      109
    ],
    [
      318,
      159
    ],
    [
      363,
      159
    ],
    [
      363,
      88
    ],
    [
      574,
      88
    ],
    [
      574,
      558
    ],
    [
      379,
      558
    ],
    [
      379,
      648
    ],
    [
      172,
      648
    ]
  ],
  "sourceConfidence": "low",
  "needsManualReview": true,
  "recognitionRulesVersion": "gray-wall-band-v2",
  "reconstructionNotes": [
    "墙线与外轮廓重新提取自原始图片，未使用旧模型坐标。",
    "房间名称按面积排序暂配，需对照原图文字确认。",
    "门窗仅保留可识别墙线缺口，未识别的符号需要图形化确认。"
  ],
  "outerPolygon": [
    [
      0.0,
      0.0
    ],
    [
      2.144,
      0.0
    ],
    [
      2.144,
      0.9426
    ],
    [
      2.3914,
      0.9426
    ],
    [
      2.3914,
      0.2992
    ],
    [
      2.5563,
      0.2992
    ],
    [
      2.4079,
      0.3142
    ],
    [
      2.4079,
      1.0623
    ],
    [
      3.1501,
      1.0623
    ],
    [
      3.1501,
      0.0
    ],
    [
      6.63,
      0.0
    ],
    [
      6.63,
      7.0324
    ],
    [
      3.414,
      7.0324
    ],
    [
      3.414,
      8.379
    ],
    [
      0.0,
      8.379
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
        2.144,
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
        2.144,
        0.0
      ],
      "end": [
        2.144,
        0.9426
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
        2.144,
        0.9426
      ],
      "end": [
        2.3914,
        0.9426
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
        2.3914,
        0.9426
      ],
      "end": [
        2.3914,
        0.2992
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
        2.3914,
        0.2992
      ],
      "end": [
        2.5563,
        0.2992
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
        2.5563,
        0.2992
      ],
      "end": [
        2.4079,
        0.3142
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
        2.4079,
        0.3142
      ],
      "end": [
        2.4079,
        1.0623
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
        2.4079,
        1.0623
      ],
      "end": [
        3.1501,
        1.0623
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
        3.1501,
        1.0623
      ],
      "end": [
        3.1501,
        0.0
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
        3.1501,
        0.0
      ],
      "end": [
        6.63,
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
        6.63,
        0.0
      ],
      "end": [
        6.63,
        7.0324
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
        6.63,
        7.0324
      ],
      "end": [
        3.414,
        7.0324
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
        3.414,
        7.0324
      ],
      "end": [
        3.414,
        8.379
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
        3.414,
        8.379
      ],
      "end": [
        0.0,
        8.379
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
        0.0,
        8.379
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
        2.2668
      ],
      "end": [
        2.0781,
        2.2668
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
        3.216,
        3.8902
      ],
      "end": [
        5.0137,
        3.8902
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
        3.282,
        0.0
      ],
      "end": [
        3.282,
        8.379
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
        4.9478,
        3.8304
      ],
      "end": [
        4.9478,
        7.0174
      ],
      "structural": "partition",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "medium"
      }
    },
    {
      "id": "wall_outer_entry",
      "start": [
        2.15,
        0.94
      ],
      "end": [
        3.15,
        0.94
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    }
  ],
  "doors": [
    {
      "id": "door_entry",
      "name": "厨房",
      "wallId": "wall_outer_entry",
      "distance": 0.5,
      "width": 0.8,
      "height": 2.1,
      "sourceEvidence": {
        "className": "door_opening",
        "confidence": "low"
      },
      "hinge": [
        0,
        0
      ]
    },
    {
      "id": "door_bathroom",
      "name": "厨房",
      "wallId": "wall_partition_1",
      "distance": 1.28,
      "width": 0.8,
      "height": 2.1,
      "sourceEvidence": {
        "className": "door_opening",
        "confidence": "low"
      },
      "hinge": [
        0,
        0
      ]
    },
    {
      "id": "door_master_bedroom",
      "name": "厨房",
      "wallId": "wall_partition_3",
      "distance": 2.6,
      "width": 0.8,
      "height": 2.1,
      "sourceEvidence": {
        "className": "door_opening",
        "confidence": "low"
      },
      "hinge": [
        0,
        0
      ]
    },
    {
      "id": "door_kitchen",
      "name": "厨房",
      "wallId": "wall_partition_3",
      "distance": 5.2,
      "width": 0.8,
      "height": 2.1,
      "sourceEvidence": {
        "className": "door_opening",
        "confidence": "low"
      },
      "hinge": [
        0,
        0
      ]
    }
  ],
  "windows": [
    {
      "id": "window_living_balcony",
      "name": "窗/推拉门（待确认）",
      "wallId": "wall_outer_12",
      "distance": 1.6,
      "width": 1.2,
      "height": 1.4,
      "sillHeight": 1.0,
      "type": "opening-unknown",
      "sourceEvidence": {
        "className": "window_frame",
        "confidence": "low"
      }
    },
    {
      "id": "window_balcony_south",
      "name": "窗/推拉门（待确认）",
      "wallId": "wall_outer_14",
      "distance": 1.7,
      "width": 1.5,
      "height": 1.4,
      "sillHeight": 1.0,
      "type": "opening-unknown",
      "sourceEvidence": {
        "className": "window_frame",
        "confidence": "low"
      }
    },
    {
      "id": "window_kitchen_south",
      "name": "窗/推拉门（待确认）",
      "wallId": "wall_outer_12",
      "distance": 2.75,
      "width": 0.9,
      "height": 1.4,
      "sillHeight": 1.0,
      "type": "opening-unknown",
      "sourceEvidence": {
        "className": "window_frame",
        "confidence": "low"
      }
    },
    {
      "id": "window_master_balcony",
      "name": "窗/推拉门（待确认）",
      "wallId": "wall_outer_11",
      "distance": 5.6,
      "width": 1.2,
      "height": 1.4,
      "sillHeight": 1.0,
      "type": "opening-unknown",
      "sourceEvidence": {
        "className": "window_frame",
        "confidence": "low"
      }
    }
  ],
  "rooms": [
    {
      "id": "room_kitchen_3",
      "name": "厨房",
      "semantic": "kitchen",
      "polygon": [
        [
          3.3315,
          3.9351
        ],
        [
          4.9148,
          3.9351
        ],
        [
          4.9148,
          6.9875
        ],
        [
          3.414,
          6.9875
        ],
        [
          3.3645,
          8.3341
        ]
      ],
      "expectedArea": 4.838,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.066,
          0.0598
        ],
        [
          3.249,
          0.0598
        ],
        [
          3.249,
          4.196949999999999
        ],
        [
          0.066,
          4.196949999999999
        ]
      ],
      "expectedArea": 13.169,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.066,
          4.196949999999999
        ],
        [
          3.249,
          4.196949999999999
        ],
        [
          3.249,
          8.3341
        ],
        [
          0.066,
          8.3341
        ]
      ],
      "expectedArea": 13.169,
      "color": "#7fa79b"
    },
    {
      "id": "room_master_bedroom_2_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          3.3315,
          0.0598
        ],
        [
          6.5805,
          0.0598
        ],
        [
          6.5805,
          3.52365
        ],
        [
          3.3315,
          3.52365
        ]
      ],
      "expectedArea": 11.254,
      "color": "#7fa79b"
    },
    {
      "id": "room_master_bedroom_2_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          3.3315,
          3.52365
        ],
        [
          6.5805,
          3.52365
        ],
        [
          6.5805,
          6.9875
        ],
        [
          3.3315,
          6.9875
        ]
      ],
      "expectedArea": 11.254,
      "color": "#7fa79b"
    }
  ],
  "virtualBoundaries": [
    {
      "id": "virtual_boundary_1",
      "start": [
        0.066,
        4.196949999999999
      ],
      "end": [
        3.249,
        4.196949999999999
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_2",
      "start": [
        3.3315,
        3.52365
      ],
      "end": [
        6.5805,
        3.52365
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    }
  ]
};
