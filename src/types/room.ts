export interface RoomData {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  isProtected: boolean;
  maxMembers: number;
  membersCount: number;
  ownerId: string;
  district?: string | null;
  distance: number;
  createdAt: string;
}

export interface RoomMemberData {
  id: string;
  nickname: string;
  role: "owner" | "moderator" | "member";
  joinedAt: string;
}

export interface RoomMessageData {
  id: string;
  roomId: string;
  userId: string;
  nickname: string;
  district?: string | null;
  type?: "text" | "image" | "video";
  text?: string | null;
  mediaUrl?: string | null;
  createdAt: string;
}
