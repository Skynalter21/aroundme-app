import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "../services/api";
import { triggerImpact, triggerNotificationSuccess } from "../services/hapticsService";
import { calculateDistanceKm } from "../services/locationService";
import socket from "../services/socket";
import { RoomData, RoomMessageData } from "../types/room";
import ImageModal from "./ImageModal";
import MediaPickerModal from "./MediaPickerModal";
import MessageCard, { MessageData } from "./MessageCard";
import RoomMembersModal, { getTtlLabel } from "./RoomMembersModal";
import SendMessageBox, { SelectedMedia } from "./SendMessageBox";

interface RoomChatModalProps {
  visible: boolean;
  room: RoomData | null;
  user: { id: string; nickname: string } | null;
  userLocation?: { latitude: number; longitude: number } | null;
  initialRole?: "owner" | "moderator" | "member";
  onClose: () => void;
}

export default function RoomChatModal({
  visible,
  room,
  user,
  userLocation,
  initialRole = "member",
  onClose,
}: RoomChatModalProps) {
  const [messages, setMessages] = useState<RoomMessageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);
  const [mediaPickerVisible, setMediaPickerVisible] = useState(false);
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [myRole, setMyRole] = useState<"owner" | "moderator" | "member">(initialRole);
  const [messageTtlMinutes, setMessageTtlMinutes] = useState<number>(room?.messageTtlMinutes || 0);

  const [currentCoords, setCurrentCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(userLocation || null);

  useEffect(() => {
    if (userLocation) {
      setCurrentCoords(userLocation);
    }
  }, [userLocation?.latitude, userLocation?.longitude]);

  // Monitora localização em tempo real enquanto o modal estiver aberto
  useEffect(() => {
    if (!visible || !room) return;
    let sub: Location.LocationSubscription | null = null;
    let isMounted = true;

    // 1. Inscrição contínua de posição
    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 2000,
        distanceInterval: 1,
      },
      (loc) => {
        if (isMounted && loc?.coords) {
          setCurrentCoords({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      }
    )
      .then((s) => {
        if (isMounted) sub = s;
        else s.remove();
      })
      .catch((err) => {
        console.log("watchPositionAsync indisponível:", err);
      });

    // 2. Polling periódico de alta confiabilidade para emuladores e segundo plano
    const intervalId = setInterval(async () => {
      try {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (isMounted && lastKnown?.coords) {
          setCurrentCoords({
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          });
          return;
        }

        const fresh = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (isMounted && fresh?.coords) {
          setCurrentCoords({
            latitude: fresh.coords.latitude,
            longitude: fresh.coords.longitude,
          });
        }
      } catch (err) {
        // silencioso
      }
    }, 2000);

    return () => {
      isMounted = false;
      sub?.remove();
      clearInterval(intervalId);
    };
  }, [visible, room?.id]);

  const roomRadius = room?.radiusKm || 5;
  const currentDistance = useMemo(() => {
    if (!room) return 0;
    if (currentCoords && room.latitude != null && room.longitude != null) {
      return calculateDistanceKm(
        currentCoords.latitude,
        currentCoords.longitude,
        room.latitude,
        room.longitude
      );
    }
    return room.distance ?? 0;
  }, [currentCoords, room]);

  const isOutsideRadius = currentDistance > roomRadius;

  const [lightbox, setLightbox] = useState<{
    visible: boolean;
    url: string | null;
    sender: string;
  }>({
    visible: false,
    url: null,
    sender: "",
  });

  const flatListRef = useRef<FlatList<RoomMessageData>>(null);

  useEffect(() => {
    if (initialRole) setMyRole(initialRole);
  }, [initialRole]);

  useEffect(() => {
    if (room?.messageTtlMinutes !== undefined) {
      setMessageTtlMinutes(room.messageTtlMinutes ?? 0);
    }
  }, [room?.id, room?.messageTtlMinutes]);

  // Carrega histórico e entra no canal da sala no Socket.IO
  useEffect(() => {
    if (!visible || !room || !user) return;

    loadRoomMessages();

    // Entra no canal do socket
    socket.emit("join_room_channel", room.id);

    function onNewRoomMessage(newMsg: RoomMessageData) {
      if (newMsg.roomId === room?.id) {
        if (newMsg.userId !== user?.id) {
          triggerNotificationSuccess();
        }
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 150);
      }
    }

    function onRoomMessageDeleted(data: { roomId: string; messageId: string }) {
      if (data.roomId === room?.id) {
        setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
      }
    }

    function onMemberKicked(data: { roomId: string; userId: string }) {
      if (data.roomId === room?.id && data.userId === user?.id) {
        Alert.alert(
          "Você foi removido",
          "Um moderador ou o dono da sala removeu você desta sala."
        );
        onClose();
      }
    }

    function onRoleUpdated(data: {
      roomId: string;
      userId: string;
      role: "owner" | "moderator" | "member";
    }) {
      if (data.roomId === room?.id && data.userId === user?.id) {
        setMyRole(data.role);
        Alert.alert(
          "Cargo atualizado!",
          `Você agora é um ${data.role === "moderator" ? "Moderador" : data.role} da sala!`
        );
      }
    }

    function onRoomSettingsUpdated(data: {
      roomId: string;
      messageTtlMinutes: number;
    }) {
      if (data.roomId === room?.id) {
        setMessageTtlMinutes(data.messageTtlMinutes);
        if (data.messageTtlMinutes > 0) {
          const cutoff = Date.now() - data.messageTtlMinutes * 60 * 1000;
          setMessages((prev) =>
            prev.filter((m) => new Date(m.createdAt).getTime() >= cutoff)
          );
        }
      }
    }

    socket.on("new_room_message", onNewRoomMessage);
    socket.on("room_message_deleted", onRoomMessageDeleted);
    socket.on("room_member_kicked", onMemberKicked);
    socket.on("room_role_updated", onRoleUpdated);
    socket.on("room_settings_updated", onRoomSettingsUpdated);

    return () => {
      socket.emit("leave_room_channel", room.id);
      socket.off("new_room_message", onNewRoomMessage);
      socket.off("room_message_deleted", onRoomMessageDeleted);
      socket.off("room_member_kicked", onMemberKicked);
      socket.off("room_role_updated", onRoleUpdated);
      socket.off("room_settings_updated", onRoomSettingsUpdated);
    };
  }, [visible, room?.id, user?.id]);

  async function loadRoomMessages() {
    if (!room) return;
    try {
      setLoading(true);
      const res = await api.get(`/rooms/${room.id}/messages`);
      setMessages(res.data);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 200);
    } catch (err) {
      console.log("Erro ao carregar mensagens da sala:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendMessage() {
    if (!user || !room) return;
    if (!messageText.trim() && !selectedMedia) return;

    if (isOutsideRadius) {
      Alert.alert(
        "Fora do raio de alcance",
        `Não é possível mandar mensagens pois você está fora do raio de alcance desta sala (${currentDistance.toFixed(1)} km de distância, alcance máximo de ${roomRadius} km).`
      );
      return;
    }

    setSending(true);
    try {
      if (selectedMedia) {
        const formData = new FormData();
        formData.append("userId", user.id);
        formData.append("nickname", user.nickname);
        formData.append("type", selectedMedia.type);
        if (currentCoords) {
          formData.append("latitude", String(currentCoords.latitude));
          formData.append("longitude", String(currentCoords.longitude));
        }
        if (messageText.trim()) {
          formData.append("text", messageText.trim());
        }

        const ext = selectedMedia.type === "video" ? "mp4" : "jpg";
        const filename =
          selectedMedia.fileName || `upload_${Date.now()}.${ext}`;
        const mimeType =
          selectedMedia.mimeType ||
          (selectedMedia.type === "video" ? "video/mp4" : "image/jpeg");

        if (Platform.OS === "web") {
          const response = await fetch(selectedMedia.uri);
          const blob = await response.blob();
          formData.append("media", blob, filename);
        } else {
          formData.append("media", {
            uri: selectedMedia.uri,
            name: filename,
            type: mimeType,
          } as any);
        }

        await api.post(`/rooms/${room.id}/messages/media`, formData);
        setSelectedMedia(null);
        setMessageText("");
      } else {
        await api.post(`/rooms/${room.id}/messages`, {
          userId: user.id,
          nickname: user.nickname,
          text: messageText.trim(),
          latitude: currentCoords?.latitude,
          longitude: currentCoords?.longitude,
        });
        setMessageText("");
      }

      triggerImpact("medium");
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    } catch (err: any) {
      console.log("Erro ao enviar mensagem na sala:", err);
      Alert.alert(
        "Erro ao enviar",
        err?.response?.data?.error || "Não foi possível enviar a mensagem."
      );
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteMessage(msg: MessageData) {
    if (!user || !room) return;

    const isAuthor = msg.userId === user.id;
    const canModerate = myRole === "owner" || myRole === "moderator";

    const promptTitle = isAuthor
      ? "Apagar sua mensagem"
      : "Moderação: Apagar mensagem";
    const promptDesc = isAuthor
      ? "Deseja apagar sua mensagem desta sala?"
      : `Como ${myRole === "owner" ? "Dono" : "Moderador"}, deseja apagar esta mensagem de "${msg.nickname}"?`;

    Alert.alert(promptTitle, promptDesc, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            triggerImpact("light");
            await api.delete(`/rooms/${room.id}/messages/${msg.id}`, {
              data: { userId: user.id },
            });
            setMessages((prev) => prev.filter((m) => m.id !== msg.id));
          } catch (err: any) {
            Alert.alert(
              "Erro",
              err?.response?.data?.error || "Não foi possível apagar a mensagem."
            );
          }
        },
      },
    ]);
  }

  // Mídia: Câmera Foto
  async function handleCameraPhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão necessária", "Precisamos de acesso à câmera.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedMedia({
        uri: asset.uri,
        type: "image",
        fileName: asset.fileName || `foto_${Date.now()}.jpg`,
        mimeType: asset.mimeType || "image/jpeg",
      });
      triggerImpact("light");
    }
  }

  // Mídia: Câmera Vídeo
  async function handleCameraVideo() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão necessária", "Precisamos de acesso à câmera.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["videos"],
      videoMaxDuration: 60,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedMedia({
        uri: asset.uri,
        type: "video",
        fileName: asset.fileName || `video_${Date.now()}.mp4`,
        mimeType: asset.mimeType || "video/mp4",
      });
      triggerImpact("light");
    }
  }

  // Mídia: Galeria
  async function handleGalleryMedia() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão necessária", "Precisamos de acesso à sua galeria.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
      videoMaxDuration: 60,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      const isVideo = asset.type === "video";
      setSelectedMedia({
        uri: asset.uri,
        type: isVideo ? "video" : "image",
        fileName:
          asset.fileName ||
          `${isVideo ? "video" : "imagem"}_${Date.now()}.${isVideo ? "mp4" : "jpg"}`,
        mimeType: asset.mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
      });
      triggerImpact("light");
    }
  }

  if (!room) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        {/* Cabeçalho da Sala */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              triggerImpact("light");
              onClose();
            }}
          >
            <Text style={styles.backText}>‹ Voltar</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.roomHeaderTitle} numberOfLines={1}>
              {room.name}
            </Text>
            <View style={styles.headerSubRow}>
              <Text style={styles.headerCategory}>{room.category}</Text>
              {isOutsideRadius ? (
                <View style={styles.headerOutsideBadge}>
                  <Text style={styles.headerOutsideBadgeText}>
                    🚫 Fora do raio ({currentDistance.toFixed(1)} km)
                  </Text>
                </View>
              ) : (
                <View style={styles.headerRadiusBadge}>
                  <Text style={styles.headerRadiusBadgeText}>
                    📍 Raio {roomRadius} km
                  </Text>
                </View>
              )}
              {myRole === "owner" ? (
                <Text style={styles.myRoleOwner}>👑 Dono</Text>
              ) : myRole === "moderator" ? (
                <Text style={styles.myRoleMod}>🛡️ Moderador</Text>
              ) : null}
              {messageTtlMinutes > 0 && (
                <TouchableOpacity
                  style={styles.headerTtlBadge}
                  onPress={() => {
                    if (myRole === "owner") setMembersModalVisible(true);
                  }}
                  disabled={myRole !== "owner"}
                  activeOpacity={0.7}
                >
                  <Text style={styles.headerTtlText}>
                    ⏱️ {getTtlLabel(messageTtlMinutes)}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.membersButton}
            onPress={() => {
              triggerImpact("light");
              setMembersModalVisible(true);
            }}
          >
            <Text style={styles.membersButtonText}>👥 Membros</Text>
          </TouchableOpacity>
        </View>

        {/* Chat / Lista de Mensagens e Caixa de Entrada */}
        <KeyboardAvoidingView
          style={styles.chatArea}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {loading ? (
            <View style={styles.loadingCenter}>
              <ActivityIndicator size="large" color="#38bdf8" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>💬</Text>
                  <Text style={styles.emptyTitle}>Sala recém-iniciada!</Text>
                  <Text style={styles.emptySubtitle}>
                    Seja a primeira pessoa a enviar uma mensagem aqui.
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <MessageCard
                  message={{
                    id: item.id,
                    userId: item.userId,
                    nickname: item.nickname,
                    avatarUrl: item.avatarUrl,
                    district: item.district,
                    type: item.type,
                    text: item.text,
                    mediaUrl: item.mediaUrl,
                    createdAt: item.createdAt,
                  }}
                  currentUserId={user?.id || ""}
                  onDelete={handleDeleteMessage}
                  onPressImage={(url, sender) => {
                    setLightbox({ visible: true, url, sender });
                  }}
                />
              )}
            />
          )}

          {/* Caixa de Entrada ou Banner de Bloqueio por Raio */}
          <View style={styles.footerInputContainer}>
            {isOutsideRadius ? (
              <View style={styles.outsideRadiusBanner}>
                <View style={styles.outsideRadiusContent}>
                  <View style={styles.outsideRadiusBadge}>
                    <Text style={styles.outsideRadiusIcon}>🚫</Text>
                  </View>
                  <View style={styles.outsideRadiusTextWrap}>
                    <Text style={styles.outsideRadiusTitle}>
                      Fora do raio de alcance ({currentDistance.toFixed(1)} km)
                    </Text>
                    <Text style={styles.outsideRadiusDesc}>
                      Não é possível mandar mensagem pois você está fora do raio de alcance desta sala (máx. {roomRadius} km em {room.district || "sua região"}).
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <SendMessageBox
                value={messageText}
                onChangeText={setMessageText}
                onSend={handleSendMessage}
                onOpenMediaPicker={() => setMediaPickerVisible(true)}
                selectedMedia={selectedMedia}
                onRemoveMedia={() => setSelectedMedia(null)}
                loading={sending}
              />
            )}
          </View>
        </KeyboardAvoidingView>

        {/* Modal de Membros e Moderação */}
        <RoomMembersModal
          visible={membersModalVisible}
          room={room}
          currentUserId={user?.id || ""}
          myRole={myRole}
          messageTtlMinutes={messageTtlMinutes}
          onUpdateTtl={setMessageTtlMinutes}
          onClose={() => setMembersModalVisible(false)}
        />

        {/* Modal Seletor de Mídia */}
        <MediaPickerModal
          visible={mediaPickerVisible}
          onClose={() => setMediaPickerVisible(false)}
          onSelectCameraPhoto={handleCameraPhoto}
          onSelectCameraVideo={handleCameraVideo}
          onSelectGallery={handleGalleryMedia}
        />

        {/* Lightbox de Imagem */}
        <ImageModal
          visible={lightbox.visible}
          imageUrl={lightbox.url}
          senderName={lightbox.sender}
          onClose={() => setLightbox({ visible: false, url: null, sender: "" })}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d1117",
  },
  chatArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#21262d",
    backgroundColor: "#161b22",
  },
  backButton: {
    paddingVertical: 6,
    paddingRight: 10,
  },
  backText: {
    color: "#38bdf8",
    fontSize: 16,
    fontWeight: "700",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 8,
  },
  roomHeaderTitle: {
    color: "#f0f6fc",
    fontSize: 16,
    fontWeight: "800",
  },
  headerSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  headerCategory: {
    color: "#8b949e",
    fontSize: 11,
    fontWeight: "500",
  },
  myRoleOwner: {
    color: "#f59e0b",
    fontSize: 10,
    fontWeight: "800",
    backgroundColor: "#3b2d10",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  myRoleMod: {
    color: "#38bdf8",
    fontSize: 10,
    fontWeight: "800",
    backgroundColor: "#1e293b",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  headerTtlBadge: {
    backgroundColor: "#1e3a8a",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#3b82f6",
  },
  headerTtlText: {
    color: "#93c5fd",
    fontSize: 10,
    fontWeight: "700",
  },
  membersButton: {
    backgroundColor: "#21262d",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#30363d",
  },
  membersButtonText: {
    color: "#c9d1d9",
    fontSize: 12,
    fontWeight: "600",
  },
  loadingCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  messagesList: {
    padding: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    color: "#f0f6fc",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtitle: {
    color: "#8b949e",
    fontSize: 13,
    textAlign: "center",
  },
  footerInputContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#0d1117",
    borderTopWidth: 1,
    borderTopColor: "#21262d",
  },
  headerRadiusBadge: {
    backgroundColor: "#0369a122",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#38bdf844",
  },
  headerRadiusBadgeText: {
    color: "#38bdf8",
    fontSize: 10,
    fontWeight: "700",
  },
  headerOutsideBadge: {
    backgroundColor: "#7f1d1d33",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#ef444455",
  },
  headerOutsideBadgeText: {
    color: "#f87171",
    fontSize: 10,
    fontWeight: "700",
  },
  outsideRadiusBanner: {
    backgroundColor: "#161b22",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ef444455",
  },
  outsideRadiusContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  outsideRadiusBadge: {
    backgroundColor: "#7f1d1d44",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  outsideRadiusIcon: {
    fontSize: 18,
  },
  outsideRadiusTextWrap: {
    flex: 1,
  },
  outsideRadiusTitle: {
    color: "#f87171",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  outsideRadiusDesc: {
    color: "#c9d1d9",
    fontSize: 12,
    lineHeight: 16,
  },
});
