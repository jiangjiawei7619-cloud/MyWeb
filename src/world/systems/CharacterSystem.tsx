import ObakeAvatar from '@/components/canvas/obake-avatar/ObakeAvatar';
import type { ObakeAvatarController } from '@/components/canvas/obake-avatar/ObakeAvatarController';

export default function CharacterSystem({
  avatarControllerRef,
}: {
  avatarControllerRef: React.RefObject<ObakeAvatarController | null>;
}) {
  return <ObakeAvatar avatarControllerRef={avatarControllerRef} />;
}
