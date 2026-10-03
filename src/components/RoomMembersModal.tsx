import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Image } from "expo-image";
import api from "../services/api";
import { resolveMediaUrl } from "../services/config";
import { triggerImpact } from "../services/hapticsService";
import { RoomData, RoomMemberData } from "../types/room";
import { EXPIRATION_OPTIONS } from "./CreateRoomModal";

export function getTtlLabel(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return "Nunca (Permanente)";
  if (minutes === 60) return "1 hora";
  if (minutes === 360) return "6 horas";
  if (minutes === 1440) return "24 horas";
  if (minutes === 10080) return "7 dias";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} horas`;
  return `${Math.round(hours / 24)} dias`;
}

interface RoomMembersModalProps {
  visible: boolean;
  room: RoomData | null;
  currentUserId: string;
  myRole: "owner" | "moderator" | "member";
  messageTtlMinutes?: number;
  onUpdateTtl?: (newTtl: number) => void;
  onClose: () => void;
  onMemberKicked?: (userId: string) => void;
}

export default function RoomMembersModal({
  visible,
  room,
  currentUserId,
  myRole,
  messageTtlMinutes,
  onUpdateTtl,
  onClose,
  onMemberKicked,
}: RoomMembersModalProps) {
  const [members, setMembers] = useState<RoomMemberData[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [ttl, setTtl] = useState<number>(messageTtlMinutes ?? room?.messageTtlMinutes ?? 0);
  const [updatingTtl, setUpdatingTtl] = useState(false);

  useEffect(() => {
    if (messageTtlMinutes !== undefined) {
      setTtl(messageTtlMinutes);
    } else if (room?.messageTtlMinutes !== undefined) {
      setTtl(room.messageTtlMinutes ?? 0);
    }
  }, [messageTtlMinutes, room?.messageTtlMinutes]);

  async function handleSelectTtl(minutes: number) {
    if (!room || myRole !== "owner" || updatingTtl) return;
    triggerImpact("medium");
    setUpdatingTtl(true);
    try {
      await api.patch(`/rooms/${room.id}/settings`, {
        ownerId: currentUserId,
        messageTtlMinutes: minutes,
      });
      setTtl(minutes);
      onUpdateTtl?.(minutes);
      Alert.alert(
        "Configuração salva!",
        `Mensagens deste grupo agora somem após: ${getTtlLabel(minutes)}.`
      );
    } catch (err) {
      console.log("Erro ao salvar tempo de mensagens:", err);
      Alert.alert("Erro", "Não foi possível atualizar o tempo das mensagens.");
    } finally {
      setUpdatingTtl(false);
    }
  }

  useEffect(() => {
    if (visible && room) {
      loadMembers();
    }
  }, [visible, room?.id]);

  async function loadMembers() {
    if (!room) return;
    setLoading(true);
    try {
      const response = await api.get(`/rooms/${room.id}/members`);
      setMembers(response.data);
    } catch (err) {
      console.log("Erro ao carregar membros:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePromote(targetMember: RoomMemberData) {
    if (!room || myRole !== "owner") return;

    Alert.alert(
      "Promover a Moderador",
      `Deseja nomear "${targetMember.nickname}" como moderador desta sala? Ele poderá expulsar membros e apagar mensagens.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Promover",
          style: "default",
          onPress: async () => {
            setActionLoadingId(targetMember.id);
            try {
              triggerImpact("medium");
              await api.post(`/rooms/${room.id}/moderators`, {
                ownerId: currentUserId,
                targetUserId: targetMember.id,
              });
              setMembers((prev) =>
                prev.map((m) =>
                  m.id === targetMember.id ? { ...m, role: "moderator" } : m
                )
              );
              Alert.alert("Sucesso", `${targetMember.nickname} agora é moderador!`);
            } catch (err: any) {
              Alert.alert(
                "Erro",
                err?.response?.data?.error || "Não foi possível promover."
              );
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  }

  async function handleKick(targetMember: RoomMemberData) {
    if (!room) return;

    Alert.alert(
      "Expulsar Membro",
      `Deseja realmente expulsar "${targetMember.nickname}" da sala?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Expulsar",
          style: "destructive",
          onPress: async () => {
            setActionLoadingId(targetMember.id);
            try {
              triggerImpact("heavy");
              await api.post(`/rooms/${room.id}/kick`, {
                actorUserId: currentUserId,
                targetUserId: targetMember.id,
              });
              setMembers((prev) => prev.filter((m) => m.id !== targetMember.id));
              onMemberKicked?.(targetMember.id);
            } catch (err: any) {
              Alert.alert(
                "Erro",
                err?.response?.data?.error || "Não foi possível expulsar."
              );
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  }

  if (!room) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modal}>
              <View style={styles.headerRow}>
                <View>
                  <Text style={styles.title}>Membros da Sala</Text>
                  <Text style={styles.subtitle}>
                    {members.length} de {room.maxMembers} pessoas
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Seção de Mensagens Temporárias */}
              <View style={styles.settingsSection}>
                <View style={styles.settingsHeader}>
                  <Text style={styles.settingsTitle}>⏱️ Mensagens Temporárias</Text>
                  <View style={styles.settingsCurrentBadge}>
                    <Text style={styles.settingsCurrentBadgeText}>
                      {getTtlLabel(ttl)}
                    </Text>
                  </View>
                </View>

                {myRole === "owner" ? (
                  <>
                    <Text style={styles.settingsSubtitle}>
                      Como dono, toque para alterar quando as mensagens somem:
                    </Text>
                    <View style={styles.ttlChipsContainer}>
                      {EXPIRATION_OPTIONS.map((opt) => {
                        const active = ttl === opt.value;
                        return (
                          <TouchableOpacity
                            key={opt.value}
                            style={[styles.ttlChip, active && styles.ttlChipActive]}
                            onPress={() => handleSelectTtl(opt.value)}
                            disabled={updatingTtl}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.ttlChipText,
                                active && styles.ttlChipTextActive,
                              ]}
                            >
                              {opt.icon} {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                ) : (
                  <Text style={styles.settingsSubtitle}>
                    {ttl > 0
                      ? `As mensagens deste grupo somem após ${getTtlLabel(ttl)}.`
                      : "As mensagens deste grupo não expiram."}
                  </Text>
                )}
              </View>

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#38bdf8" />
                </View>
              ) : (
                <FlatList
                  data={members}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.listContainer}
                  renderItem={({ item }) => {
                    const isMe = item.id === currentUserId;
                    const isOwner = item.role === "owner";
                    const isModerator = item.role === "moderator";

                    const canPromote =
                      myRole === "owner" && !isOwner && !isModerator;

                    const canKick =
                      !isMe &&
                      !isOwner &&
                      (myRole === "owner" ||
                        (myRole === "moderator" && !isModerator));

                    return (
                      <View style={styles.memberCard}>
                        {item.avatarUrl ? (
                          <Image
                            source={{ uri: resolveMediaUrl(item.avatarUrl)! }}
                            style={styles.avatarImage}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={styles.avatarCircle}>
                            <Text style={styles.avatarInitial}>
                              {(item.nickname || "A").charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}

                        <View style={styles.memberInfo}>
                          <View style={styles.nameRow}>
                            <Text style={styles.nicknameText} numberOfLines={1}>
                              {item.nickname}
                            </Text>
                            {isMe && <Text style={styles.meBadge}>Você</Text>}
                          </View>

                          <View style={styles.roleContainer}>
                            {isOwner ? (
                              <Text style={styles.ownerBadge}>👑 Dono</Text>
                            ) : isModerator ? (
                              <Text style={styles.moderatorBadge}>
                                🛡️ Moderador
                              </Text>
                            ) : (
                              <Text style={styles.memberBadge}>Membro</Text>
                            )}
                          </View>
                        </View>

                        {/* Ações de Moderação */}
                        <View style={styles.actionsContainer}>
                          {actionLoadingId === item.id ? (
                            <ActivityIndicator size="small" color="#38bdf8" />
                          ) : (
                            <>
                              {canPromote && (
                                <TouchableOpacity
                                  style={styles.promoteButton}
                                  onPress={() => handlePromote(item)}
                                >
                                  <Text style={styles.promoteButtonText}>
                                    🛡️ Promover
                                  </Text>
                                </TouchableOpacity>
                              )}

                              {canKick && (
                                <TouchableOpacity
                                  style={styles.kickButton}
                                  onPress={() => handleKick(item)}
                                >
                                  <Text style={styles.kickButtonText}>
                                    Expulsar
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </>
                          )}
                        </View>
                      </View>
                    );
                  }}
                />
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modal: {
    backgroundColor: "#161b22",
    borderRadius: 24,
    padding: 20,
    width: "100%",
    maxWidth: 420,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: "#30363d",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#21262d",
    paddingBottom: 12,
  },
  title: {
    color: "#f0f6fc",
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    color: "#8b949e",
    fontSize: 12,
    marginTop: 2,
  },
  closeIcon: {
    color: "#8b949e",
    fontSize: 20,
    fontWeight: "700",
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  listContainer: {
    paddingBottom: 10,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d1117",
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#21262d",
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#21262d",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#1e293b",
    marginRight: 12,
  },
  avatarInitial: {
    color: "#38bdf8",
    fontSize: 16,
    fontWeight: "700",
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nicknameText: {
    color: "#f0f6fc",
    fontSize: 14,
    fontWeight: "600",
    maxWidth: 130,
  },
  meBadge: {
    color: "#8b949e",
    fontSize: 11,
    backgroundColor: "#161b22",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  roleContainer: {
    marginTop: 3,
  },
  ownerBadge: {
    color: "#f59e0b",
    fontSize: 11,
    fontWeight: "700",
  },
  moderatorBadge: {
    color: "#38bdf8",
    fontSize: 11,
    fontWeight: "700",
  },
  memberBadge: {
    color: "#6b7280",
    fontSize: 11,
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  promoteButton: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3b82f655",
  },
  promoteButtonText: {
    color: "#60a5fa",
    fontSize: 11,
    fontWeight: "700",
  },
  kickButton: {
    backgroundColor: "#3b1111",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ef444455",
  },
  kickButtonText: {
    color: "#f87171",
    fontSize: 11,
    fontWeight: "700",
  },
  settingsSection: {
    backgroundColor: "#161b22",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  settingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  settingsTitle: {
    color: "#f0f6fc",
    fontSize: 14,
    fontWeight: "700",
  },
  settingsCurrentBadge: {
    backgroundColor: "#1e3a8a",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#3b82f6",
  },
  settingsCurrentBadgeText: {
    color: "#93c5fd",
    fontSize: 11,
    fontWeight: "700",
  },
  settingsSubtitle: {
    color: "#8b949e",
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 16,
  },
  ttlChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  ttlChip: {
    backgroundColor: "#0d1117",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  ttlChipActive: {
    backgroundColor: "#2563eb",
    borderColor: "#60a5fa",
  },
  ttlChipText: {
    color: "#8b949e",
    fontSize: 12,
    fontWeight: "600",
  },
  ttlChipTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
});
