import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export const LOADING_FACE_REFRESH_MS = 3800;

export type FacePose = {
  neckY: number;
  tiltZ: number;
  tiltX: number;
};

export type LoadingFaceMotion = {
  neckY: number;
  tiltZ: number;
  tiltX: number;
  eyesClosed: boolean;
  refreshing: boolean;
  surfaceRef: RefObject<HTMLDivElement | null>;
};

type BeatPlan = {
  blink: boolean;
  move: boolean;
  nod: boolean;
  refresh: boolean;
};

function randomRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function chance(probability: number) {
  return Math.random() < probability;
}

function pickPose(): FacePose {
  const strong = chance(0.45);
  const maxTilt = strong ? 16 : 10;
  const maxTurn = strong ? 22 : 14;

  return {
    neckY: chance(0.68) ? randomRange(-maxTurn, maxTurn) : 0,
    tiltZ: chance(0.68) ? randomRange(-maxTilt, maxTilt) : 0,
    tiltX: 0,
  };
}

/** 刷新少见；多数轮次为 2～3 个动作组合 */
function pickBeatPlan(): BeatPlan {
  if (chance(0.08)) {
    return {
      blink: chance(0.45),
      move: false,
      nod: false,
      refresh: true,
    };
  }

  if (chance(0.78)) {
    const move = chance(0.88);
    const nod = chance(0.72);
    const blink = chance(0.86);
    return {
      blink: blink || (!move && !nod),
      move,
      nod: nod || (!move && blink),
      refresh: false,
    };
  }

  const roll = Math.random();
  if (roll < 0.28) {
    return { blink: true, move: true, nod: false, refresh: false };
  }
  if (roll < 0.5) {
    return { blink: true, move: false, nod: true, refresh: false };
  }
  if (roll < 0.72) {
    return { blink: false, move: true, nod: true, refresh: false };
  }
  if (roll < 0.88) {
    return { blink: true, move: false, nod: false, refresh: false };
  }
  return { blink: false, move: true, nod: false, refresh: false };
}

export function useLoadingFaceMotion(active: boolean): LoadingFaceMotion {
  const [neckY, setNeckY] = useState(0);
  const [tiltZ, setTiltZ] = useState(0);
  const [tiltX, setTiltX] = useState(0);
  const [eyesClosed, setEyesClosed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const timersRef = useRef<number[]>([]);
  const cancelledRef = useRef(false);
  const poseRef = useRef<FacePose>({ neckY: 0, tiltZ: 0, tiltX: 0 });

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const delay = useCallback((ms: number) => {
    if (cancelledRef.current) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const id = window.setTimeout(() => {
        if (!cancelledRef.current) resolve();
      }, ms);
      timersRef.current.push(id);
    });
  }, []);

  const applyPose = useCallback((pose: FacePose) => {
    poseRef.current = pose;
    setNeckY(pose.neckY);
    setTiltZ(pose.tiltZ);
    setTiltX(pose.tiltX);
  }, []);

  const resetPose = useCallback(async () => {
    applyPose({ neckY: 0, tiltZ: 0, tiltX: 0 });
    await delay(820);
  }, [applyPose, delay]);

  const blinkOnce = useCallback(async () => {
    setEyesClosed(true);
    await delay(randomRange(90, 150));
    setEyesClosed(false);
  }, [delay]);

  const blink = useCallback(async () => {
    await blinkOnce();
    if (chance(0.3)) {
      await delay(randomRange(120, 220));
      await blinkOnce();
    }
  }, [blinkOnce, delay]);

  const runNod = useCallback(
    async (base: Pick<FacePose, 'neckY' | 'tiltZ'>) => {
      const depth = randomRange(7, 13);
      applyPose({ ...base, tiltX: depth });
      await delay(randomRange(300, 480));
      applyPose({ ...base, tiltX: 0 });
      await delay(randomRange(220, 360));

      if (chance(0.24)) {
        applyPose({ ...base, tiltX: depth * 0.82 });
        await delay(randomRange(240, 380));
        applyPose({ ...base, tiltX: 0 });
      }
    },
    [applyPose, delay],
  );

  const runRefresh = useCallback(() => {
    if (cancelledRef.current) return Promise.resolve();

    return new Promise<void>((resolve) => {
      const surface = surfaceRef.current;
      if (!surface) {
        resolve();
        return;
      }

      const finish = () => {
        surface.removeEventListener('animationend', onEnd);
        setRefreshing(false);
        resolve();
      };

      const fallbackId = window.setTimeout(finish, LOADING_FACE_REFRESH_MS + 100);
      timersRef.current.push(fallbackId);

      const onEnd = () => {
        window.clearTimeout(fallbackId);
        finish();
      };

      setRefreshing(true);
      surface.addEventListener('animationend', onEnd, { once: true });
    });
  }, []);

  const runRandomBeat = useCallback(async () => {
    const plan = pickBeatPlan();

    if (plan.refresh) {
      await resetPose();
      const refreshPromise = runRefresh();
      if (plan.blink) {
        void delay(randomRange(600, 1500)).then(() => {
          if (!cancelledRef.current) void blinkOnce();
        });
      }
      await refreshPromise;
      return;
    }

    const basePose = plan.move ? pickPose() : { neckY: 0, tiltZ: 0, tiltX: 0 };
    if (plan.move) {
      applyPose(basePose);
    }

    const holdMs = randomRange(1500, 3000);
    const nodBase = { neckY: basePose.neckY, tiltZ: basePose.tiltZ };

    if (plan.blink) {
      void delay(randomRange(180, plan.nod ? 700 : holdMs * 0.65)).then(() => {
        if (!cancelledRef.current) void blink();
      });
    }

    if (plan.nod) {
      const nodDelay = plan.move ? randomRange(320, 900) : randomRange(120, 420);
      void delay(nodDelay).then(() => {
        if (!cancelledRef.current) void runNod(nodBase);
      });
    }

    if (!plan.move && !plan.blink && plan.nod) {
      await runNod(nodBase);
      return;
    }

    if (!plan.move && plan.blink && !plan.nod) {
      await delay(randomRange(150, 450));
      await blink();
      return;
    }

    await delay(holdMs);

    if (plan.move && chance(0.58)) {
      await resetPose();
    } else if (plan.nod || plan.move) {
      applyPose({ ...nodBase, tiltX: 0 });
    }
  }, [applyPose, blink, blinkOnce, delay, resetPose, runNod, runRefresh]);

  useEffect(() => {
    if (!active) return;

    cancelledRef.current = false;
    clearTimers();

    const loop = async () => {
      await delay(randomRange(700, 1300));
      while (!cancelledRef.current) {
        await runRandomBeat();
        await delay(randomRange(450, 1200));
      }
    };

    void loop();

    return () => {
      cancelledRef.current = true;
      clearTimers();
      setRefreshing(false);
      setEyesClosed(false);
      setNeckY(0);
      setTiltZ(0);
      setTiltX(0);
      poseRef.current = { neckY: 0, tiltZ: 0, tiltX: 0 };
    };
  }, [active, clearTimers, delay, runRandomBeat]);

  return { neckY, tiltZ, tiltX, eyesClosed, refreshing, surfaceRef };
}
