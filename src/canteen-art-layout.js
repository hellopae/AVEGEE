// ART-CANTEEN: visual-only size; bottom of the painted foundation stays on the owner foot.
// th: Z1-V5-FX owner picture #4 (scripts/build-canteen-th.py), cropped so the foundation's lowest row is the bottom edge.
export const CANTEEN_ART_SCALE=1.08;
export const CANTEEN_ART_FOOT_Y=Object.freeze({"th":0.9970544918998527,"asia":0.9625,"west":0.959375,"cyberhell":0.9875});
// FX3 (owner 14:10): zone 1 is mirrored again like the old canteen.  Zones without an entry keep the old rule (mirrored for th/asia/cyberhell).
export const CANTEEN_ART_FLIP=Object.freeze({th:true});
// FX3: the painted base floated on the cliff edge / bushes behind the plaza; draw it this many world units lower (visual only: the station, label and worker spot stay).
export const CANTEEN_ART_DY=Object.freeze({th:26});
// th: the owner's picture #4 is a bigger pavilion than the old canteen; 1.4x reads right beside the ~120-150 wide houses and still fits the ledge between the two stairs.
export const CANTEEN_ART_SCALE_BY_ZONE=Object.freeze({th:1.4});
