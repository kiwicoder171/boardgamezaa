export const DEFAULT_AVATARS = ['🎲', '🦊', '🐯', '🐼', '🦁', '🧙‍♂️', '🥷', '🤖', '👾', '👑', '🚀', '🦄', '🍕', '🕵️‍♂️'];

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
}

export function getUserProfile(): UserProfile {
  if (typeof window === 'undefined') {
    return { id: 'temp-user', name: 'Player', avatar: '🎲' };
  }

  let id = localStorage.getItem('bgz_user_id');
  if (!id) {
    id = `usr_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    localStorage.setItem('bgz_user_id', id);
  }

  let name = localStorage.getItem('bgz_user_name');
  if (!name) {
    name = `Player_${Math.floor(100 + Math.random() * 900)}`;
    localStorage.setItem('bgz_user_name', name);
  }

  let avatar = localStorage.getItem('bgz_user_avatar');
  if (!avatar) {
    avatar = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
    localStorage.setItem('bgz_user_avatar', avatar);
  }

  return { id, name, avatar };
}

export function saveUserProfile(name: string, avatar: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('bgz_user_name', name.trim());
  localStorage.setItem('bgz_user_avatar', avatar);
}
