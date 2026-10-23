import type { PascalV2Spec } from "../../types";

export const floorplan: PascalV2Spec = {
  "schema": "dreamhouse-pascal-floorplan/v2",
  "id": "two-option-08",
  "name": "两居方案8",
  "factory": "source-driven-pascal-v2",
  "sourceImage": "/preset/variants/two/option-08.png",
  "sourceImageDimensions": {
    "widthPx": 812,
    "heightPx": 792
  },
  "sourceCropPx": {
    "x": 91,
    "y": 127,
    "width": 633,
    "height": 561
  },
  "sourceDimensions": {
    "widthM": null,
    "depthM": null
  },
  "scale": {
    "pixelToMeterX": 0.01579778830963665,
    "pixelToMeterZ": 0.01579778830963665,
    "confidence": "low",
    "references": [
      "相对比例预览，绝对尺寸待核实"
    ]
  },
  "sourceOuterPolygonPx": [
    [
      370,
      127
    ],
    [
      411,
      175
    ],
    [
      724,
      175
    ],
    [
      724,
      411
    ],
    [
      623,
      411
    ],
    [
      623,
      688
    ],
    [
      187,
      688
    ],
    [
      187,
      589
    ],
    [
      91,
      469
    ],
    [
      91,
      460
    ],
    [
      330,
      177
    ],
    [
      336,
      183
    ],
    [
      346,
      171
    ],
    [
      351,
      177
    ],
    [
      342,
      192
    ],
    [
      351,
      197
    ],
    [
      360,
      183
    ],
    [
      377,
      184
    ],
    [
      379,
      195
    ],
    [
      394,
      186
    ],
    [
      375,
      160
    ],
    [
      357,
      158
    ],
    [
      362,
      147
    ],
    [
      353,
      151
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
      4.4076,
      0.0
    ],
    [
      5.0553,
      0.7583
    ],
    [
      10.0,
      0.7583
    ],
    [
      10.0,
      4.4866
    ],
    [
      8.4044,
      4.4866
    ],
    [
      8.4044,
      8.8626
    ],
    [
      1.5166,
      8.8626
    ],
    [
      1.5166,
      7.2986
    ],
    [
      0.0,
      5.4028
    ],
    [
      0.0,
      5.2607
    ],
    [
      3.7757,
      0.7899
    ],
    [
      3.8705,
      0.8847
    ],
    [
      4.0284,
      0.6951
    ],
    [
      4.1074,
      0.7899
    ],
    [
      3.9652,
      1.0269
    ],
    [
      4.1074,
      1.1058
    ],
    [
      4.2496,
      0.8847
    ],
    [
      4.5182,
      0.9005
    ],
    [
      4.5498,
      1.0742
    ],
    [
      4.7867,
      0.9321
    ],
    [
      4.4866,
      0.5213
    ],
    [
      4.2022,
      0.4897
    ],
    [
      4.2812,
      0.316
    ],
    [
      4.139,
      0.3791
    ]
  ],
  "walls": [
    {
      "id": "wall_outer_1",
      "start": [
        4.4076,
        0.0
      ],
      "end": [
        5.0553,
        0.7583
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
        5.0553,
        0.7583
      ],
      "end": [
        10.0,
        0.7583
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
        10.0,
        0.7583
      ],
      "end": [
        10.0,
        4.4866
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
        4.4866
      ],
      "end": [
        8.4044,
        4.4866
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
        8.4044,
        4.4866
      ],
      "end": [
        8.4044,
        8.8626
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
        8.4044,
        8.8626
      ],
      "end": [
        1.5166,
        8.8626
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
        1.5166,
        8.8626
      ],
      "end": [
        1.5166,
        7.2986
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
        1.5166,
        7.2986
      ],
      "end": [
        0.0,
        5.4028
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
        0.0,
        5.4028
      ],
      "end": [
        0.0,
        5.2607
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
        5.2607
      ],
      "end": [
        3.7757,
        0.7899
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
        3.7757,
        0.7899
      ],
      "end": [
        3.8705,
        0.8847
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
        3.8705,
        0.8847
      ],
      "end": [
        4.0284,
        0.6951
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
        4.1074,
        0.7899
      ],
      "end": [
        3.9652,
        1.0269
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
        3.9652,
        1.0269
      ],
      "end": [
        4.1074,
        1.1058
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
        4.1074,
        1.1058
      ],
      "end": [
        4.2496,
        0.8847
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
        4.2496,
        0.8847
      ],
      "end": [
        4.5182,
        0.9005
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
        4.5182,
        0.9005
      ],
      "end": [
        4.5498,
        1.0742
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_19",
      "start": [
        4.5498,
        1.0742
      ],
      "end": [
        4.7867,
        0.9321
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
        4.7867,
        0.9321
      ],
      "end": [
        4.4866,
        0.5213
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_21",
      "start": [
        4.4866,
        0.5213
      ],
      "end": [
        4.2022,
        0.4897
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
        4.2022,
        0.4897
      ],
      "end": [
        4.2812,
        0.316
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_23",
      "start": [
        4.2812,
        0.316
      ],
      "end": [
        4.139,
        0.3791
      ],
      "structural": "load_bearing",
      "sourceEvidence": {
        "className": "wall_band",
        "confidence": "high"
      }
    },
    {
      "id": "wall_outer_24",
      "start": [
        4.139,
        0.3791
      ],
      "end": [
        4.4076,
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
        5.8136,
        3.2701
      ],
      "end": [
        6.793,
        3.2701
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
        6.0032,
        4.3602
      ],
      "end": [
        8.4044,
        4.3602
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
        5.9084,
        6.2322
      ],
      "end": [
        8.4044,
        6.2322
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
        1.4534,
        7.2512
      ],
      "end": [
        2.7014,
        7.2512
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
        4.2654,
        7.2591
      ],
      "end": [
        5.0395,
        7.2591
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
        4.9921,
        0.6477
      ],
      "end": [
        4.9921,
        8.8626
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
        6.0585,
        3.2227
      ],
      "end": [
        6.0585,
        6.3033
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
      "distance": 2.9939,
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
      "wallId": "wall_outer_6",
      "distance": 3.4439,
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
      "id": "room_living_room_1_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          5.0395,
          0.7899
        ],
        [
          9.9526,
          0.7899
        ],
        [
          9.9526,
          4.80255
        ],
        [
          5.0395,
          4.80255
        ]
      ],
      "expectedArea": 19.715,
      "color": "#7fa79b"
    },
    {
      "id": "room_living_room_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          5.0395,
          4.80255
        ],
        [
          9.9526,
          4.80255
        ],
        [
          9.9526,
          8.8152
        ],
        [
          5.0395,
          8.8152
        ]
      ],
      "expectedArea": 19.715,
      "color": "#7fa79b"
    },
    {
      "id": "room_master_bedroom_2_split_1_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0632,
          0.0948
        ],
        [
          2.51185,
          0.0948
        ],
        [
          2.51185,
          4.455
        ],
        [
          0.0632,
          4.455
        ]
      ],
      "expectedArea": 10.677,
      "color": "#7fa79b"
    },
    {
      "id": "room_master_bedroom_2_split_1_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          2.51185,
          0.0948
        ],
        [
          4.9605,
          0.0948
        ],
        [
          4.9605,
          4.455
        ],
        [
          2.51185,
          4.455
        ]
      ],
      "expectedArea": 10.677,
      "color": "#7fa79b"
    },
    {
      "id": "room_master_bedroom_2_split_2_split_1",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          0.0632,
          4.455
        ],
        [
          2.51185,
          4.455
        ],
        [
          2.51185,
          8.8152
        ],
        [
          0.0632,
          8.8152
        ]
      ],
      "expectedArea": 10.677,
      "color": "#7fa79b"
    },
    {
      "id": "room_master_bedroom_2_split_2_split_2",
      "name": "待确认空间",
      "semantic": "storage",
      "polygon": [
        [
          2.51185,
          4.455
        ],
        [
          4.9605,
          4.455
        ],
        [
          4.9605,
          8.8152
        ],
        [
          2.51185,
          8.8152
        ]
      ],
      "expectedArea": 10.677,
      "color": "#7fa79b"
    }
  ],
  "virtualBoundaries": [
    {
      "id": "virtual_boundary_1",
      "start": [
        5.0395,
        4.80255
      ],
      "end": [
        9.9526,
        4.80255
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_2",
      "start": [
        0.0632,
        4.455
      ],
      "end": [
        4.9605,
        4.455
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_3",
      "start": [
        2.51185,
        0.0948
      ],
      "end": [
        2.51185,
        4.455
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    },
    {
      "id": "virtual_boundary_4",
      "start": [
        2.51185,
        4.455
      ],
      "end": [
        2.51185,
        8.8152
      ],
      "sourceEvidence": "房间区域分割，不存在连续灰色墙带"
    }
  ]
};
