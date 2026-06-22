/** Rapier 物理世界与第一人称控制器常量 */

export const GRAVITY = { x: 0, y: -9.81, z: 0 } as const;
export const FIXED_TIMESTEP = 1 / 60;

/** 胶囊体：半径 0.5，总高 1.8 → halfHeight = (1.8 - 2×0.5) / 2 */
export const CAPSULE_RADIUS = 0.5;
export const CAPSULE_HALF_HEIGHT = 0.4;
export const CAPSULE_TOTAL_HEIGHT = CAPSULE_HALF_HEIGHT * 2 + CAPSULE_RADIUS * 2;

export const PLAYER_MASS = 70;
export const PLAYER_FRICTION = 0.8;
export const PLAYER_RESTITUTION = 0;

export const MOVE_SPEED = 5;
export const JUMP_HEIGHT = 1.5 * 0.8 * 0.9;
/** v = √(2gh)，与 Rapier 重力 -9.81 一致 */
export const JUMP_VELOCITY = Math.sqrt(2 * 9.81 * JUMP_HEIGHT);

/** 二段跳高度（米） */
export const AIR_JUMP_HEIGHT = 1.5 * 0.8;
export const AIR_JUMP_VELOCITY = Math.sqrt(2 * 9.81 * AIR_JUMP_HEIGHT);

/** 最大跳跃次数（含地面起跳） */
export const MAX_JUMPS = 2;

/** 地面 / 空中水平加速度 (m/s²) */
export const GROUND_ACCEL = 48;
export const AIR_ACCEL = 10;
/** 地面松键摩擦衰减 (1/s) */
export const GROUND_FRICTION = 22;
/** 判定在地面：竖直速度需低于此值 (m/s) */
export const GROUNDED_VY_THRESHOLD = 0.35;

/** 地面半边长：原 100×100m，面积扩大 2 倍后约 141×141m */
export const WORLD_AREA_SCALE = 1.5;
/** 城市布局基准半边长（生成坐标系） */
export const WORLD_LAYOUT_BASE_HALF = 50 * Math.SQRT2;
// Area grows by 1.5x, so X/Z coordinates and half-extents use sqrt(1.5).
/** EXPLORE 照明/雾/霓虹条相对布局坐标的缩放 */
export const EXPLORE_WORLD_SCALE = Math.sqrt(WORLD_AREA_SCALE);
export const GROUND_HALF_EXTENT = WORLD_LAYOUT_BASE_HALF * EXPLORE_WORLD_SCALE;
export const GROUND_THICKNESS = 0.05;

/** 世界边缘空气墙 */
export const BOUNDARY_WALL_HEIGHT = 18;
export const BOUNDARY_WALL_THICKNESS = 0.6;

/** 相机相对刚体中心的垂直偏移（约 1.6m 眼高） */
export const EYE_OFFSET_Y = 0.7;

/** EXPLORE 第三人称：相机 pivot 相对刚体中心的高度（胸口/幽灵中心） */
export const THIRD_PERSON_PIVOT_Y = 0.22;
/** EXPLORE 第三人称：相机沿视线反向后退距离（越大角色在画面中越小） */
export const THIRD_PERSON_DISTANCE = 3.15;
/** EXPLORE 第三人称：俯视偏移（弧度），角色落在画面偏下 */
export const THIRD_PERSON_PITCH_BIAS = -0.22;

export const PITCH_MIN = (-85 * Math.PI) / 180;
export const PITCH_MAX = (85 * Math.PI) / 180;

export const MOUSE_SENSITIVITY = 0.003;

/** 角速度衰减（越大停得越快） */
export const LOOK_MOMENTUM_DECAY = 5.2;
/** 拖动时角速度跟随指针的灵敏度（0–1，越大越贴手、惯性越短） */
export const LOOK_MOMENTUM_SAMPLE = 0.38;
/** 惯性角速度上限（rad/s） */
export const LOOK_MOMENTUM_MAX = 2.4;
/** 拖动位移中立即生效的比例，其余由角速度积分产生滑动感 */
export const LOOK_DIRECT_BLEND = 0.22;
/** 按住不动超过该时长（ms）时，拖动中的角速度额外衰减，避免松手“假滑” */
export const LOOK_STATIONARY_MS = 36;
/** 按住不动时的衰减倍率（仅拖动中、无指针位移时） */
export const LOOK_STATIONARY_DECAY_MULT = 4.2;

/** 镜头运动 FX（走路仰视时中心收缩 + 边缘拉伸，Samsy 风格） */
export const CAMERA_BASE_FOV = 75;
/** 满速时额外 FOV（越大边缘拉伸越强；中心由 dolly 稳住） */
export const CAMERA_WALK_FOV_BOOST = 18.928;
/** dolly-zoom：FOV 变宽时沿视线前移，稳住画面中心 */
export const CAMERA_DOLLY_PUSH_SCALE = 8.3824;
/** >1 时静止/慢走几乎无拉伸，满速拉伸更猛（对比度） */
export const CAMERA_STRETCH_CONTRAST = 2.35;
/** 行走/FOV 拉伸整体平滑速度 */
export const CAMERA_FX_SMOOTH = 8;
/** 俯仰角超过水平（仰视）此阈值（弧度，0 = 地平线）时开始拉伸；与行走独立，满足其一即可 */
export const CAMERA_PITCH_STRETCH_THRESHOLD = 0;
/** 仰视达到此俯仰角（弧度，≈40°）时拉伸达满强度 */
export const CAMERA_PITCH_STRETCH_MAX = (40 * Math.PI) / 180;
/** 俯仰拉伸强度单独平滑速度（越大仰视跟手越快） */
export const CAMERA_STRETCH_PITCH_SMOOTH = 10;
