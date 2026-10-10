import { KRATA_WALK } from './krata-control.js';
// Regional room backgrounds and shared image-space geometry.
// Coordinates are normalized image-space visual suggestions; review collision per scene.
export const WIDE_ROOM_ART = {
  "th": {
    "sala": {
      "image": "img/rooms-wide/th-sala.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.78,
        0.65
      ],
      "trainingApproach": [
        0.68,
        0.77
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "document-puzzle",
        "targets": [
          "nira"
        ],
        "reward": "order-level"
      }
    },
    "krata": {
      "image": "img/rooms-wide/th-krata.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.83,
        0.64
      ],
      "trainingApproach": [
        0.73,
        0.76
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "stoke-fire",
        "targets": [
          "plerng"
        ],
        "reward": "crew-level"
      }
    },
    "dab": {
      "image": "img/rooms-wide/th-dab.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.85,
        0.58
      ],
      "trainingApproach": [
        0.75,
        0.7
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "sword-slash",
        "targets": [
          "yama"
        ],
        "reward": "attack-level"
      }
    },
    "lokan": {
      "image": "img/rooms-wide/th-lokan-ice-v2.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.83,
        0.6
      ],
      "trainingApproach": [
        0.73,
        0.72
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "stone-lift",
        "targets": [
          "guard"
        ],
        "reward": "crew-level"
      }
    },
    "ngiw": {
      "image": "img/rooms-wide/th-ngiw.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.81,
        0.66
      ],
      "trainingApproach": [
        0.7100000000000001,
        0.78
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "thorn-tree-slash",
        "targets": [
          "dam"
        ],
        "reward": "crew-level"
      }
    },
    "lan": {
      "image": "img/rooms-wide/th-lan.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.85,
        0.72
      ],
      "trainingApproach": [
        0.75,
        0.82
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "stone-lift",
        "targets": [
          "taan",
          "guard"
        ],
        "reward": "crew-level"
      }
    },
    "krajok": {
      "image": "img/rooms-wide/th-krajok.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.75,
        0.68
      ],
      "trainingApproach": [
        0.65,
        0.8
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "mirror-angle",
        "targets": [
          "kan"
        ],
        "reward": "crew-level"
      }
    },
    "sawan": {
      "image": "img/rooms-wide/th-sawan.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.82,
        0.64
      ],
      "trainingApproach": [
        0.72,
        0.76
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "breathing-meditation",
        "targets": [
          "boon"
        ],
        "reward": "crew-level"
      }
    },
    "tarang": {
      "image": "img/rooms-wide/th-tarang.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": null,
      "trainingApproach": null,
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": null
    }
  },
  "asia": {
    "sala": {
      "image": "img/rooms-wide/asia-sala.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.78,
        0.64
      ],
      "trainingApproach": [
        0.68,
        0.76
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "document-puzzle",
        "targets": [
          "nira"
        ],
        "reward": "order-level"
      }
    },
    "krata": {
      "image": "img/rooms-wide/asia-krata.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.8,
        0.61
      ],
      "trainingApproach": [
        0.7000000000000001,
        0.73
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "stoke-fire",
        "targets": [
          "plerng"
        ],
        "reward": "crew-level"
      }
    },
    "dab": {
      "image": "img/rooms-wide/asia-dab.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.84,
        0.61
      ],
      "trainingApproach": [
        0.74,
        0.73
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "sword-slash",
        "targets": [
          "yama"
        ],
        "reward": "attack-level"
      }
    },
    "lokan": {
      "image": "img/rooms-wide/asia-lokan-ice-v2.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.83,
        0.6
      ],
      "trainingApproach": [
        0.73,
        0.72
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "stone-lift",
        "targets": [
          "guard"
        ],
        "reward": "crew-level"
      }
    },
    "ngiw": {
      "image": "img/rooms-wide/asia-ngiw.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.82,
        0.64
      ],
      "trainingApproach": [
        0.72,
        0.76
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "thorn-tree-slash",
        "targets": [
          "dam"
        ],
        "reward": "crew-level"
      }
    },
    "lan": {
      "image": "img/rooms-wide/asia-lan.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.84,
        0.63
      ],
      "trainingApproach": [
        0.74,
        0.75
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "stone-lift",
        "targets": [
          "taan",
          "guard"
        ],
        "reward": "crew-level"
      }
    },
    "krajok": {
      "image": "img/rooms-wide/asia-krajok.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.76,
        0.64
      ],
      "trainingApproach": [
        0.66,
        0.76
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "mirror-angle",
        "targets": [
          "kan"
        ],
        "reward": "crew-level"
      }
    },
    "sawan": {
      "image": "img/rooms-wide/asia-sawan.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.83,
        0.58
      ],
      "trainingApproach": [
        0.73,
        0.7
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "breathing-meditation",
        "targets": [
          "boon"
        ],
        "reward": "crew-level"
      }
    },
    "tarang": {
      "image": "img/rooms-wide/asia-tarang.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": null,
      "trainingApproach": null,
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": null
    }
  },
  "west": {
    "sala": {
      "image": "img/rooms-wide/west-sala.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.78,
        0.65
      ],
      "trainingApproach": [
        0.68,
        0.77
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "document-puzzle",
        "targets": [
          "nira"
        ],
        "reward": "order-level"
      }
    },
    "krata": {
      "image": "img/rooms-wide/west-krata.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.83,
        0.64
      ],
      "trainingApproach": [
        0.73,
        0.76
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "stoke-fire",
        "targets": [
          "plerng"
        ],
        "reward": "crew-level"
      }
    },
    "dab": {
      "image": "img/rooms-wide/west-dab.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.88,
        0.63
      ],
      "trainingApproach": [
        0.78,
        0.75
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "sword-slash",
        "targets": [
          "yama"
        ],
        "reward": "attack-level"
      }
    },
    "lokan": {
      "image": "img/rooms-wide/west-lokan-ice-v2.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.82,
        0.66
      ],
      "trainingApproach": [
        0.72,
        0.78
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "stone-lift",
        "targets": [
          "guard"
        ],
        "reward": "crew-level"
      }
    },
    "ngiw": {
      "image": "img/rooms-wide/west-ngiw.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.82,
        0.64
      ],
      "trainingApproach": [
        0.72,
        0.76
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "thorn-tree-slash",
        "targets": [
          "dam"
        ],
        "reward": "crew-level"
      }
    },
    "lan": {
      "image": "img/rooms-wide/west-lan.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.84,
        0.69
      ],
      "trainingApproach": [
        0.74,
        0.8099999999999999
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "stone-lift",
        "targets": [
          "taan",
          "guard"
        ],
        "reward": "crew-level"
      }
    },
    "krajok": {
      "image": "img/rooms-wide/west-krajok.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.84,
        0.62
      ],
      "trainingApproach": [
        0.74,
        0.74
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "mirror-angle",
        "targets": [
          "kan"
        ],
        "reward": "crew-level"
      }
    },
    "sawan": {
      "image": "img/rooms-wide/west-sawan.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.82,
        0.61
      ],
      "trainingApproach": [
        0.72,
        0.73
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "breathing-meditation",
        "targets": [
          "boon"
        ],
        "reward": "crew-level"
      }
    },
    "tarang": {
      "image": "img/rooms-wide/west-tarang.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": null,
      "trainingApproach": null,
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": null
    }
  },
  "cyberhell": {
    "sala": {
      "image": "img/rooms-wide/cyberhell-sala.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.78,
        0.65
      ],
      "trainingApproach": [
        0.68,
        0.77
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "document-puzzle",
        "targets": [
          "nira"
        ],
        "reward": "order-level"
      }
    },
    "krata": {
      "image": "img/rooms-wide/cyberhell-krata.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.82,
        0.63
      ],
      "trainingApproach": [
        0.72,
        0.75
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "stoke-fire",
        "targets": [
          "plerng"
        ],
        "reward": "crew-level"
      }
    },
    "dab": {
      "image": "img/rooms-wide/cyberhell-dab.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.86,
        0.61
      ],
      "trainingApproach": [
        0.76,
        0.73
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "sword-slash",
        "targets": [
          "yama"
        ],
        "reward": "attack-level"
      }
    },
    "lokan": {
      "image": "img/rooms-wide/cyberhell-lokan-ice-v2.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.83,
        0.62
      ],
      "trainingApproach": [
        0.73,
        0.74
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "stone-lift",
        "targets": [
          "guard"
        ],
        "reward": "crew-level"
      }
    },
    "ngiw": {
      "image": "img/rooms-wide/cyberhell-ngiw.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.83,
        0.6
      ],
      "trainingApproach": [
        0.73,
        0.72
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "thorn-tree-slash",
        "targets": [
          "dam"
        ],
        "reward": "crew-level"
      }
    },
    "lan": {
      "image": "img/rooms-wide/cyberhell-lan.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.84,
        0.64
      ],
      "trainingApproach": [
        0.74,
        0.76
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "stone-lift",
        "targets": [
          "taan",
          "guard"
        ],
        "reward": "crew-level"
      }
    },
    "krajok": {
      "image": "img/rooms-wide/cyberhell-krajok.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.78,
        0.65
      ],
      "trainingApproach": [
        0.68,
        0.77
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "mirror-angle",
        "targets": [
          "kan"
        ],
        "reward": "crew-level"
      }
    },
    "sawan": {
      "image": "img/rooms-wide/cyberhell-sawan.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": [
        0.81,
        0.65
      ],
      "trainingApproach": [
        0.7100000000000001,
        0.77
      ],
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": {
        "activity": "breathing-meditation",
        "targets": [
          "boon"
        ],
        "reward": "crew-level"
      }
    },
    "tarang": {
      "image": "img/rooms-wide/cyberhell-tarang.webp",
      "entrance": [
        0.5,
        0.88
      ],
      "crew": [
        0.28,
        0.74
      ],
      "trainingProp": null,
      "trainingApproach": null,
      "displaySlots": [
        [
          0.4,
          0.49
        ],
        [
          0.5,
          0.49
        ],
        [
          0.6,
          0.49
        ]
      ],
      "minigame": null
    }
  }
};

/** Preserve ratio and fill the viewport; transform every actor/hotspot through this box. */
export function wideRoomImageBox(width, height, imageWidth, imageHeight) {
  const scale = Math.max(width / imageWidth, height / imageHeight);
  const w = imageWidth * scale, h = imageHeight * scale;
  return { x:(width-w)/2, y:(height-h)/2, w, h };
}
export function wideRoomPoint(point, box) {
  return { x:box.x+point[0]*box.w, y:box.y+point[1]*box.h };
}

/** The painted courtyard has a central entrance and a separate training alcove. */
// Image-space floor traced from the sala reference; desk, shelves and plinths stay outside.
export const SALA_WALK = [
  {poly:[[.07,.74],[.18,.49],[.23,.39],[.34,.39],[.34,.52],[.64,.52],[.64,.72],[.94,.72],[.94,.81],[.60,.81],[.60,1],[.40,1],[.40,.81],[.07,.81]]},
  {poly:[[.23,.39],[.78,.39],[.81,.43],[.23,.43]]},
  {poly:[[.66,.43],[.81,.43],[.86,.53],[.66,.53]]},
  {poly:[[.91,.53],[.95,.74],[.90,.74],[.90,.54]]},
];
export function wideStationRoom(zone, key) {
  const art = WIDE_ROOM_ART[zone]?.[key];
  if (!art) return null;
  return {
    image:art.image, cover:true, crop:null, mirror:false, bright:1, light:null,
    me:[...art.entrance], crew:key === 'sala' ? [.60,.68] : [...art.crew], souls:art.displaySlots.map(p => [p[0], p[1] + (key === 'tarang' ? .06 : 0)]),
    act:key === 'krata' ? [.5,.54] : key === 'sala' ? [.50,.53] : key === 'tarang' || key === 'sawan' ? [...art.crew] : [.5,.62],
    training:key !== 'krata' && art.trainingApproach && [art.trainingApproach[0], Math.min(.78,art.trainingApproach[1])],
    actions:key === 'sala' ? [[.50,.19],[.74,.51]] : [[.50,.30],[.64,.30]], exit:{x:.5,y:.96,reach:.05},
    walk:key === 'krata' && zone === 'th' ? KRATA_WALK : key === 'sala' ? SALA_WALK.map(a=>({poly:a.poly.map(p=>[...p])})) : [{poly:[[.17,.51],[.71,.51],[.71,.69],[.80,.69],[.80,.81],[.68,.81],
      [.68,.83],[.59,.83],[.59,1],[.41,1],[.41,.83],[.23,.83],[.17,.72]]}],
  };
}
