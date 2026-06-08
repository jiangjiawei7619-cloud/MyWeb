import RAPIER from '@dimforge/rapier3d-compat';
import {
  BOUNDARY_WALL_HEIGHT,
  BOUNDARY_WALL_THICKNESS,
  CAPSULE_HALF_HEIGHT,
  CAPSULE_RADIUS,
  CAPSULE_TOTAL_HEIGHT,
  GRAVITY,
  GROUND_HALF_EXTENT,
  GROUND_THICKNESS,
  PLAYER_FRICTION,
  PLAYER_MASS,
  PLAYER_RESTITUTION,
} from '@/physics/rapier-config';

export interface PhysicsWorldBundle {
  world: RAPIER.World;
  playerBody: RAPIER.RigidBody;
  playerCollider: RAPIER.Collider;
  groundBody: RAPIER.RigidBody;
}

function createBoundaryWalls(world: RAPIER.World) {
  const extent = GROUND_HALF_EXTENT;
  const halfH = BOUNDARY_WALL_HEIGHT / 2;
  const halfT = BOUNDARY_WALL_THICKNESS / 2;
  const y = halfH;

  const walls: { x: number; z: number; hx: number; hz: number }[] = [
    { x: extent + halfT, z: 0, hx: halfT, hz: extent },
    { x: -extent - halfT, z: 0, hx: halfT, hz: extent },
    { x: 0, z: extent + halfT, hx: extent, hz: halfT },
    { x: 0, z: -extent - halfT, hx: extent, hz: halfT },
  ];

  for (const wall of walls) {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(wall.x, y, wall.z));
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(wall.hx, halfH, wall.hz).setFriction(PLAYER_FRICTION).setRestitution(0),
      body,
    );
  }
}

export function createPhysicsWorld(): PhysicsWorldBundle {
  const world = new RAPIER.World(GRAVITY);

  const groundBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -GROUND_THICKNESS, 0));
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(GROUND_HALF_EXTENT, GROUND_THICKNESS, GROUND_HALF_EXTENT)
      .setFriction(PLAYER_FRICTION)
      .setRestitution(0),
    groundBody,
  );

  createBoundaryWalls(world);

  const spawnY = CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS;
  const playerBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, spawnY, 0)
      .lockRotations()
      .setCanSleep(false)
      .setLinearDamping(0)
      .setAngularDamping(0),
  );

  const playerCollider = world.createCollider(
    RAPIER.ColliderDesc.capsule(CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS)
      .setMass(PLAYER_MASS)
      .setFriction(PLAYER_FRICTION)
      .setRestitution(PLAYER_RESTITUTION),
    playerBody,
  );

  return { world, playerBody, playerCollider, groundBody };
}

export function getCapsuleSpawnY(): number {
  return CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS;
}

export { CAPSULE_TOTAL_HEIGHT, GROUND_HALF_EXTENT };
