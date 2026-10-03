// Native RGBA strips; equal frame bounds and scale preserve the standing foot anchor.
const SHEETS = {
  "th:nira": {
    "src": "img/crew-nira-walk-v2.png",
    "frameSize": {
      "w": 406,
      "h": 692
    },
    "frames": [
      {
        "x": 152,
        "y": 13,
        "w": 318,
        "h": 692,
        "ox": 88,
        "oy": 0
      },
      {
        "x": 672,
        "y": 13,
        "w": 320,
        "h": 692,
        "ox": 65,
        "oy": 0
      },
      {
        "x": 1182,
        "y": 13,
        "w": 319,
        "h": 692,
        "ox": 32,
        "oy": 0
      },
      {
        "x": 1693,
        "y": 13,
        "w": 318,
        "h": 692,
        "ox": 0,
        "oy": 0
      }
    ],
    "rightFacing": false,
    "heightScale": 1.0,
    "footOffset": 0.0
  },
  "th:taan": {
    "src": "img/crew-taan-walk-v2.png",
    "frameSize": {
      "w": 543,
      "h": 667
    },
    "frames": [
      {
        "x": 12,
        "y": 28,
        "w": 531,
        "h": 662,
        "ox": 12,
        "oy": 0
      },
      {
        "x": 543,
        "y": 28,
        "w": 527,
        "h": 667,
        "ox": 0,
        "oy": 0
      },
      {
        "x": 1086,
        "y": 28,
        "w": 513,
        "h": 662,
        "ox": 0,
        "oy": 0
      },
      {
        "x": 1629,
        "y": 29,
        "w": 531,
        "h": 666,
        "ox": 0,
        "oy": 1
      }
    ],
    "rightFacing": false,
    "heightScale": 1.0,
    "footOffset": 0.0
  },
  "th:plerng": {
    "src": "img/crew-plerng-walk-v2.png",
    "frameSize": {
      "w": 448,
      "h": 704
    },
    "frames": [
      {
        "x": 143,
        "y": 5,
        "w": 363,
        "h": 703,
        "ox": 85,
        "oy": 1
      },
      {
        "x": 656,
        "y": 4,
        "w": 341,
        "h": 696,
        "ox": 55,
        "oy": 0
      },
      {
        "x": 1153,
        "y": 4,
        "w": 350,
        "h": 696,
        "ox": 9,
        "oy": 0
      },
      {
        "x": 1687,
        "y": 5,
        "w": 340,
        "h": 695,
        "ox": 0,
        "oy": 1
      }
    ],
    "rightFacing": true,
    "heightScale": 1.0,
    "footOffset": 0.0
  },
  "th:dam": {
    "src": "img/crew-dam-walk-v2.png",
    "frameSize": {
      "w": 486,
      "h": 621
    },
    "frames": [
      {
        "x": 73,
        "y": 47,
        "w": 449,
        "h": 621,
        "ox": 37,
        "oy": 0
      },
      {
        "x": 595,
        "y": 52,
        "w": 458,
        "h": 616,
        "ox": 16,
        "oy": 5
      },
      {
        "x": 1138,
        "y": 49,
        "w": 468,
        "h": 619,
        "ox": 16,
        "oy": 2
      },
      {
        "x": 1665,
        "y": 51,
        "w": 461,
        "h": 613,
        "ox": 0,
        "oy": 4
      }
    ],
    "rightFacing": false,
    "heightScale": 1.0,
    "footOffset": 0.0
  },
  "th:kan": {
    "src": "img/crew-kan-walk-v2.png",
    "frameSize": {
      "w": 417,
      "h": 643
    },
    "frames": [
      {
        "x": 125,
        "y": 31,
        "w": 378,
        "h": 643,
        "ox": 39,
        "oy": 0
      },
      {
        "x": 648,
        "y": 31,
        "w": 383,
        "h": 642,
        "ox": 19,
        "oy": 0
      },
      {
        "x": 1172,
        "y": 31,
        "w": 395,
        "h": 643,
        "ox": 0,
        "oy": 0
      },
      {
        "x": 1733,
        "y": 31,
        "w": 382,
        "h": 643,
        "ox": 18,
        "oy": 0
      }
    ],
    "rightFacing": false,
    "heightScale": 1.0,
    "footOffset": 0.0
  },
  "th:boon": {
    "src": "img/crew-boon-walk-v2.png",
    "frameSize": {
      "w": 327,
      "h": 589
    },
    "frames": [
      {
        "x": 140,
        "y": 75,
        "w": 290,
        "h": 589,
        "ox": 37,
        "oy": 0
      },
      {
        "x": 665,
        "y": 75,
        "w": 290,
        "h": 589,
        "ox": 19,
        "oy": 0
      },
      {
        "x": 1194,
        "y": 75,
        "w": 292,
        "h": 589,
        "ox": 5,
        "oy": 0
      },
      {
        "x": 1732,
        "y": 75,
        "w": 288,
        "h": 589,
        "ox": 0,
        "oy": 0
      }
    ],
    "rightFacing": true,
    "heightScale": 1.0,
    "footOffset": 0.0
  },
  "th:guard": {
    "src": "img/crew-guard-walk-v2.png",
    "frameSize": {
      "w": 469,
      "h": 698
    },
    "frames": [
      {
        "x": 74,
        "y": 10,
        "w": 453,
        "h": 688,
        "ox": 0,
        "oy": 0
      },
      {
        "x": 617,
        "y": 10,
        "w": 441,
        "h": 697,
        "ox": 0,
        "oy": 0
      },
      {
        "x": 1180,
        "y": 11,
        "w": 449,
        "h": 687,
        "ox": 20,
        "oy": 1
      },
      {
        "x": 1722,
        "y": 12,
        "w": 429,
        "h": 696,
        "ox": 19,
        "oy": 2
      }
    ],
    "rightFacing": true,
    "heightScale": 0.9992,
    "footOffset": 0.0
  },
  "asia:nira": {
    "src": "img/Asia/crew-nira-asia-walk-v2.png",
    "frameSize": {
      "w": 414,
      "h": 711
    },
    "frames": [
      {
        "x": 107,
        "y": 2,
        "w": 378,
        "h": 710,
        "ox": 36,
        "oy": 0
      },
      {
        "x": 634,
        "y": 2,
        "w": 373,
        "h": 708,
        "ox": 21,
        "oy": 0
      },
      {
        "x": 1156,
        "y": 2,
        "w": 377,
        "h": 711,
        "ox": 0,
        "oy": 0
      },
      {
        "x": 1701,
        "y": 2,
        "w": 378,
        "h": 711,
        "ox": 2,
        "oy": 0
      }
    ],
    "rightFacing": false,
    "heightScale": 1.0,
    "footOffset": 0.0
  },
  "asia:taan": {
    "src": "img/Asia/crew-taan-asia-walk-v2.png",
    "frameSize": {
      "w": 543,
      "h": 634
    },
    "frames": [
      {
        "x": 21,
        "y": 47,
        "w": 522,
        "h": 619,
        "ox": 21,
        "oy": 4
      },
      {
        "x": 551,
        "y": 45,
        "w": 533,
        "h": 627,
        "ox": 8,
        "oy": 2
      },
      {
        "x": 1086,
        "y": 43,
        "w": 522,
        "h": 623,
        "ox": 0,
        "oy": 0
      },
      {
        "x": 1629,
        "y": 43,
        "w": 521,
        "h": 634,
        "ox": 0,
        "oy": 0
      }
    ],
    "rightFacing": false,
    "heightScale": 1.0,
    "footOffset": 0.0
  },
  "asia:plerng": {
    "src": "img/Asia/crew-plerng-asia-walk-v2.png",
    "frameSize": {
      "w": 543,
      "h": 671
    },
    "frames": [
      {
        "x": 39,
        "y": 25,
        "w": 504,
        "h": 670,
        "ox": 39,
        "oy": 1
      },
      {
        "x": 559,
        "y": 25,
        "w": 500,
        "h": 670,
        "ox": 16,
        "oy": 1
      },
      {
        "x": 1087,
        "y": 25,
        "w": 520,
        "h": 670,
        "ox": 1,
        "oy": 1
      },
      {
        "x": 1629,
        "y": 24,
        "w": 500,
        "h": 671,
        "ox": 0,
        "oy": 0
      }
    ],
    "rightFacing": false,
    "heightScale": 1.0,
    "footOffset": 0.0
  },
  "asia:dam": {
    "src": "img/Asia/crew-dam-asia-walk-v2.png",
    "frameSize": {
      "w": 502,
      "h": 614
    },
    "frames": [
      {
        "x": 69,
        "y": 53,
        "w": 474,
        "h": 613,
        "ox": 28,
        "oy": 0
      },
      {
        "x": 601,
        "y": 53,
        "w": 463,
        "h": 608,
        "ox": 17,
        "oy": 0
      },
      {
        "x": 1127,
        "y": 53,
        "w": 502,
        "h": 614,
        "ox": 0,
        "oy": 0
      },
      {
        "x": 1673,
        "y": 53,
        "w": 461,
        "h": 609,
        "ox": 3,
        "oy": 0
      }
    ],
    "rightFacing": false,
    "heightScale": 1.0,
    "footOffset": 0.0
  },
  "asia:kan": {
    "src": "img/Asia/crew-kan-asia-walk-v2.png",
    "frameSize": {
      "w": 387,
      "h": 681
    },
    "frames": [
      {
        "x": 78,
        "y": 20,
        "w": 370,
        "h": 673,
        "ox": 17,
        "oy": 2
      },
      {
        "x": 604,
        "y": 18,
        "w": 372,
        "h": 681,
        "ox": 0,
        "oy": 0
      },
      {
        "x": 1148,
        "y": 18,
        "w": 382,
        "h": 677,
        "ox": 1,
        "oy": 0
      },
      {
        "x": 1697,
        "y": 19,
        "w": 380,
        "h": 680,
        "ox": 7,
        "oy": 1
      }
    ],
    "rightFacing": false,
    "heightScale": 1.0,
    "footOffset": 0.0
  },
  "asia:boon": {
    "src": "img/Asia/crew-boon-asia-walk-v2.png",
    "frameSize": {
      "w": 543,
      "h": 638
    },
    "frames": [
      {
        "x": 110,
        "y": 45,
        "w": 433,
        "h": 626,
        "ox": 110,
        "oy": 8
      },
      {
        "x": 625,
        "y": 37,
        "w": 461,
        "h": 638,
        "ox": 82,
        "oy": 0
      },
      {
        "x": 1123,
        "y": 38,
        "w": 504,
        "h": 635,
        "ox": 37,
        "oy": 1
      },
      {
        "x": 1629,
        "y": 38,
        "w": 493,
        "h": 637,
        "ox": 0,
        "oy": 1
      }
    ],
    "rightFacing": false,
    "heightScale": 1.0,
    "footOffset": 0.0
  },
  "asia:guard": {
    "src": "img/Asia/crew-guard-asia-walk-v2.png",
    "frameSize": {
      "w": 454,
      "h": 700
    },
    "frames": [
      {
        "x": 115,
        "y": 9,
        "w": 428,
        "h": 694,
        "ox": 26,
        "oy": 0
      },
      {
        "x": 649,
        "y": 9,
        "w": 437,
        "h": 700,
        "ox": 17,
        "oy": 0
      },
      {
        "x": 1177,
        "y": 9,
        "w": 452,
        "h": 695,
        "ox": 2,
        "oy": 0
      },
      {
        "x": 1718,
        "y": 9,
        "w": 437,
        "h": 700,
        "ox": 0,
        "oy": 0
      }
    ],
    "rightFacing": false,
    "heightScale": 1.0,
    "footOffset": 0.0
  },
  "west:nira": {
    "src": "img/West/crew-nira-west-walk-v2.png",
    "frameSize": {
      "w": 467,
      "h": 698
    },
    "frames": [
      {
        "x": 81,
        "y": 10,
        "w": 447,
        "h": 698,
        "ox": 20,
        "oy": 0
      },
      {
        "x": 622,
        "y": 10,
        "w": 439,
        "h": 698,
        "ox": 18,
        "oy": 0
      },
      {
        "x": 1150,
        "y": 10,
        "w": 459,
        "h": 698,
        "ox": 3,
        "oy": 0
      },
      {
        "x": 1690,
        "y": 10,
        "w": 451,
        "h": 698,
        "ox": 0,
        "oy": 0
      }
    ],
    "rightFacing": false,
    "heightScale": 1.0,
    "footOffset": 0.0
  },
  "west:taan": {
    "src": "img/West/crew-taan-west-walk-v2.png",
    "frameSize": {
      "w": 500,
      "h": 666
    },
    "frames": [
      {
        "x": 88,
        "y": 31,
        "w": 455,
        "h": 662,
        "ox": 45,
        "oy": 3
      },
      {
        "x": 628,
        "y": 31,
        "w": 458,
        "h": 659,
        "ox": 42,
        "oy": 3
      },
      {
        "x": 1133,
        "y": 32,
        "w": 481,
        "h": 662,
        "ox": 4,
        "oy": 4
      },
      {
        "x": 1672,
        "y": 28,
        "w": 456,
        "h": 662,
        "ox": 0,
        "oy": 0
      }
    ],
    "rightFacing": true,
    "heightScale": 1.0,
    "footOffset": 0.0
  },
  "west:plerng": {
    "src": "img/West/crew-plerng-west-walk-v2.png",
    "frameSize": {
      "w": 527,
      "h": 668
    },
    "frames": [
      {
        "x": 34,
        "y": 23,
        "w": 509,
        "h": 668,
        "ox": 18,
        "oy": 0
      },
      {
        "x": 603,
        "y": 23,
        "w": 482,
        "h": 668,
        "ox": 44,
        "oy": 0
      },
      {
        "x": 1102,
        "y": 23,
        "w": 527,
        "h": 667,
        "ox": 0,
        "oy": 0
      },
      {
        "x": 1689,
        "y": 23,
        "w": 473,
        "h": 668,
        "ox": 44,
        "oy": 0
      }
    ],
    "rightFacing": true,
    "heightScale": 1.0,
    "footOffset": 0.0
  },
  "west:dam": {
    "src": "img/West/crew-dam-west-walk-v2.png",
    "frameSize": {
      "w": 469,
      "h": 660
    },
    "frames": [
      {
        "x": 51,
        "y": 20,
        "w": 466,
        "h": 659,
        "ox": 3,
        "oy": 1
      },
      {
        "x": 598,
        "y": 19,
        "w": 438,
        "h": 656,
        "ox": 7,
        "oy": 0
      },
      {
        "x": 1134,
        "y": 24,
        "w": 455,
        "h": 655,
        "ox": 0,
        "oy": 5
      },
      {
        "x": 1685,
        "y": 19,
        "w": 434,
        "h": 657,
        "ox": 8,
        "oy": 0
      }
    ],
    "rightFacing": true,
    "heightScale": 1.0,
    "footOffset": 0.0
  },
  "west:kan": {
    "src": "img/West/crew-kan-west-walk-v2.png",
    "frameSize": {
      "w": 529,
      "h": 682
    },
    "frames": [
      {
        "x": 117,
        "y": 15,
        "w": 426,
        "h": 682,
        "ox": 103,
        "oy": 0
      },
      {
        "x": 631,
        "y": 15,
        "w": 395,
        "h": 682,
        "ox": 74,
        "oy": 0
      },
      {
        "x": 1134,
        "y": 16,
        "w": 400,
        "h": 681,
        "ox": 34,
        "oy": 1
      },
      {
        "x": 1643,
        "y": 15,
        "w": 397,
        "h": 682,
        "ox": 0,
        "oy": 0
      }
    ],
    "rightFacing": true,
    "heightScale": 1.0,
    "footOffset": 0.0
  },
  "west:boon": {
    "src": "img/West/crew-boon-west-walk-v2.png",
    "frameSize": {
      "w": 536,
      "h": 700
    },
    "frames": [
      {
        "x": 75,
        "y": 11,
        "w": 461,
        "h": 700,
        "ox": 75,
        "oy": 0
      },
      {
        "x": 580,
        "y": 11,
        "w": 442,
        "h": 695,
        "ox": 37,
        "oy": 0
      },
      {
        "x": 1086,
        "y": 15,
        "w": 475,
        "h": 696,
        "ox": 0,
        "oy": 4
      },
      {
        "x": 1646,
        "y": 11,
        "w": 455,
        "h": 695,
        "ox": 17,
        "oy": 0
      }
    ],
    "rightFacing": true,
    "heightScale": 1.0,
    "footOffset": 0.0
  },
  "west:guard": {
    "src": "img/West/crew-guard-west-walk-v2.png",
    "frameSize": {
      "w": 526,
      "h": 687
    },
    "frames": [
      {
        "x": 21,
        "y": 7,
        "w": 522,
        "h": 683,
        "ox": 4,
        "oy": 0
      },
      {
        "x": 570,
        "y": 16,
        "w": 514,
        "h": 678,
        "ox": 10,
        "oy": 9
      },
      {
        "x": 1103,
        "y": 15,
        "w": 526,
        "h": 679,
        "ox": 0,
        "oy": 8
      },
      {
        "x": 1646,
        "y": 9,
        "w": 523,
        "h": 685,
        "ox": 0,
        "oy": 2
      }
    ],
    "rightFacing": true,
    "heightScale": 1.0,
    "footOffset": 0.0
  },
  "cyberhell:nira": {
    "src": "img/CyberHell/crew-nira-cyberhell-walk-v2.png",
    "frameSize": {
      "w": 381,
      "h": 690
    },
    "frames": [
      {
        "x": 104,
        "y": 12,
        "w": 365,
        "h": 689,
        "ox": 16,
        "oy": 0
      },
      {
        "x": 636,
        "y": 12,
        "w": 370,
        "h": 690,
        "ox": 5,
        "oy": 0
      },
      {
        "x": 1180,
        "y": 12,
        "w": 375,
        "h": 689,
        "ox": 6,
        "oy": 0
      },
      {
        "x": 1717,
        "y": 12,
        "w": 368,
        "h": 689,
        "ox": 0,
        "oy": 0
      }
    ],
    "rightFacing": true,
    "heightScale": 1.0,
    "footOffset": 0.0
  },
  "cyberhell:taan": {
    "src": "img/CyberHell/crew-taan-cyberhell-walk-v2.png",
    "frameSize": {
      "w": 538,
      "h": 525
    },
    "frames": [
      {
        "x": 7,
        "y": 116,
        "w": 536,
        "h": 519,
        "ox": 2,
        "oy": 0
      },
      {
        "x": 550,
        "y": 116,
        "w": 523,
        "h": 525,
        "ox": 2,
        "oy": 0
      },
      {
        "x": 1091,
        "y": 116,
        "w": 538,
        "h": 519,
        "ox": 0,
        "oy": 0
      },
      {
        "x": 1639,
        "y": 116,
        "w": 516,
        "h": 525,
        "ox": 5,
        "oy": 0
      }
    ],
    "rightFacing": false,
    "heightScale": 0.873,
    "footOffset": 0.0
  },
  "cyberhell:plerng": {
    "src": "img/CyberHell/crew-plerng-cyberhell-walk-v2.png",
    "frameSize": {
      "w": 384,
      "h": 689
    },
    "frames": [
      {
        "x": 118,
        "y": 13,
        "w": 350,
        "h": 687,
        "ox": 34,
        "oy": 2
      },
      {
        "x": 658,
        "y": 12,
        "w": 325,
        "h": 685,
        "ox": 31,
        "oy": 1
      },
      {
        "x": 1182,
        "y": 13,
        "w": 340,
        "h": 687,
        "ox": 12,
        "oy": 2
      },
      {
        "x": 1713,
        "y": 11,
        "w": 330,
        "h": 686,
        "ox": 0,
        "oy": 0
      }
    ],
    "rightFacing": true,
    "heightScale": 1.0,
    "footOffset": 0.0
  },
  "cyberhell:dam": {
    "src": "img/CyberHell/crew-dam-cyberhell-walk-v2.png",
    "frameSize": {
      "w": 498,
      "h": 670
    },
    "frames": [
      {
        "x": 59,
        "y": 20,
        "w": 484,
        "h": 666,
        "ox": 14,
        "oy": 4
      },
      {
        "x": 607,
        "y": 16,
        "w": 453,
        "h": 667,
        "ox": 19,
        "oy": 0
      },
      {
        "x": 1136,
        "y": 16,
        "w": 466,
        "h": 667,
        "ox": 5,
        "oy": 0
      },
      {
        "x": 1674,
        "y": 16,
        "w": 453,
        "h": 667,
        "ox": 0,
        "oy": 0
      }
    ],
    "rightFacing": false,
    "heightScale": 1.0,
    "footOffset": 0.0
  },
  "cyberhell:kan": {
    "src": "img/CyberHell/crew-kan-cyberhell-walk-v2.png",
    "frameSize": {
      "w": 432,
      "h": 676
    },
    "frames": [
      {
        "x": 127,
        "y": 32,
        "w": 347,
        "h": 670,
        "ox": 85,
        "oy": 6
      },
      {
        "x": 627,
        "y": 26,
        "w": 362,
        "h": 676,
        "ox": 43,
        "oy": 0
      },
      {
        "x": 1162,
        "y": 32,
        "w": 377,
        "h": 670,
        "ox": 35,
        "oy": 6
      },
      {
        "x": 1670,
        "y": 26,
        "w": 365,
        "h": 676,
        "ox": 0,
        "oy": 0
      }
    ],
    "rightFacing": true,
    "heightScale": 1.0,
    "footOffset": 0.0
  },
  "cyberhell:boon": {
    "src": "img/CyberHell/crew-boon-cyberhell-walk-v2.png",
    "frameSize": {
      "w": 519,
      "h": 672
    },
    "frames": [
      {
        "x": 162,
        "y": 30,
        "w": 381,
        "h": 671,
        "ox": 138,
        "oy": 1
      },
      {
        "x": 672,
        "y": 29,
        "w": 346,
        "h": 664,
        "ox": 105,
        "oy": 0
      },
      {
        "x": 1143,
        "y": 29,
        "w": 373,
        "h": 672,
        "ox": 33,
        "oy": 0
      },
      {
        "x": 1653,
        "y": 29,
        "w": 342,
        "h": 664,
        "ox": 0,
        "oy": 0
      }
    ],
    "rightFacing": true,
    "heightScale": 1.0,
    "footOffset": 0.0
  },
  "cyberhell:guard": {
    "src": "img/CyberHell/crew-guard-cyberhell-walk-v2.png",
    "frameSize": {
      "w": 493,
      "h": 667
    },
    "frames": [
      {
        "x": 50,
        "y": 21,
        "w": 493,
        "h": 665,
        "ox": 0,
        "oy": 0
      },
      {
        "x": 608,
        "y": 24,
        "w": 478,
        "h": 662,
        "ox": 15,
        "oy": 3
      },
      {
        "x": 1182,
        "y": 23,
        "w": 447,
        "h": 665,
        "ox": 46,
        "oy": 2
      },
      {
        "x": 1698,
        "y": 25,
        "w": 457,
        "h": 659,
        "ox": 19,
        "oy": 4
      }
    ],
    "rightFacing": false,
    "heightScale": 0.9848,
    "footOffset": 0.0
  }
};

export function crewWalkSheet(key, zone = "th") {
  return SHEETS[`${zone}:${key.replace(/^crew-/, "")}`] || null;
}
