import * as Crypto from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CreateRoomModal from "../components/CreateRoomModal";
import ImageModal from "../components/ImageModal";
import MediaPickerModal from "../components/MediaPickerModal";
import MessageCard, { MessageData } from "../components/MessageCard";
import ProfileModal from "../components/ProfileModal";
import RadiusModal from "../components/RadiusModal";
import RoomCard from "../components/RoomCard";
import RoomChatModal from "../components/RoomChatModal";
import RoomPasswordModal from "../components/RoomPasswordModal";
import SendMessageBox, { SelectedMedia } from "../components/SendMessageBox";
import { RoomData } from "../types/room";

import * as Notifications from "expo-notifications";
import api from "../services/api";
import {
  triggerImpact,
  triggerNotificationSuccess,
  triggerSelection,
} from "../services/hapticsService";
import {
  getUserCurrentLocation,
  calculateDistanceKm,
} from "../services/locationService";
import {
  registerForPushNotificationsAsync,
  displayLocalMessageNotification,
} from "../services/notificationService";
import socket from "../services/socket";
import {
  getStoredUser,
  removeStoredUser,
  saveStoredUser,
} from "../storage/userStorage";

interface User {
  id: string;
  nickname: string;
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

export default function Home() {
  const [nickname, setNickname] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [radius, setRadius] = useState(5);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [socketConnected, setSocketConnected] = useState(socket.connected);

  const [address, setAddress] = useState({
    city: "",
    district: "Buscando localização...",
    region: "",
  });

  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [sending, setSending] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);

  // Navegação por Abas
  const [activeTab, setActiveTab] = useState<"feed" | "rooms">("feed");

  // Estado das Salas de Bate-Papo
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [createRoomVisible, setCreateRoomVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [selectedRoomForPassword, setSelectedRoomForPassword] =
    useState<RoomData | null>(null);
  const [activeRoom, setActiveRoom] = useState<RoomData | null>(null);
  const [activeRoomRole, setActiveRoomRole] = useState<
    "owner" | "moderator" | "member"
  >("member");

  // Modais e mídias
  const [radiusModalVisible, setRadiusModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [mediaPickerVisible, setMediaPickerVisible] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);
  const [lightbox, setLightbox] = useState<{
    visible: boolean;
    url: string | null;
    sender: string;
  }>({
    visible: false,
    url: null,
    sender: "",
  });

  const flatListRef = useRef<FlatList<MessageData>>(null);

  // Inicializa serviço de notificações locais e obtém push token
  useEffect(() => {
    let isMounted = true;
    async function initNotifications() {
      const token = await registerForPushNotificationsAsync();
      if (isMounted && token) {
        setPushToken(token);
      }
    }
    initNotifications();
    return () => {
      isMounted = false;
    };
  }, []);

  // Listener para quando o usuário toca em uma notificação recebida
  useEffect(() => {
    const subscription =
      Notifications.addNotificationResponseReceivedListener(() => {
        loadMessages();
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 300);
      });

    return () => {
      subscription.remove();
    };
  }, [location, radius]);

  // Sincroniza usuário, localização e push token no backend
  useEffect(() => {
    if (user) {
      api
        .post("/users", {
          id: user.id,
          nickname: user.nickname,
          pushToken: pushToken || null,
          latitude: location?.latitude,
          longitude: location?.longitude,
        })
        .catch((err) =>
          console.log("[Sync] Erro ao sincronizar push token:", err?.message || err)
        );
    }
  }, [user?.id, user?.nickname, pushToken, location?.latitude, location?.longitude]);

  // Carrega usuário salvo
  useEffect(() => {
    async function initUser() {
      const saved = await getStoredUser();
      if (saved) {
        setUser(saved);
      }
    }
    initUser();
  }, []);

  // Busca localização ao ter usuário
  useEffect(() => {
    if (user) {
      fetchLocation();
    }
  }, [user]);

  // Carrega mensagens e salas sempre que localização ou raio mudar
  useEffect(() => {
    if (location) {
      loadMessages();
      loadRooms();
    }
  }, [location, radius]);

  // Gerencia eventos do WebSocket de forma limpa
  useEffect(() => {
    function onConnect() {
      console.log("Socket conectado");
      setSocketConnected(true);
    }

    function onDisconnect() {
      console.log("Socket desconectado");
      setSocketConnected(false);
    }

    function onNewMessage(newMsg?: MessageData) {
      if (newMsg && user && newMsg.userId !== user.id) {
        // Feedback tátil imediato de nova mensagem
        triggerNotificationSuccess();

        // Checa se a mensagem está dentro do raio do usuário
        let isWithinRadius = true;
        if (
          location &&
          typeof newMsg.latitude === "number" &&
          typeof newMsg.longitude === "number"
        ) {
          const dist = calculateDistanceKm(
            location.latitude,
            location.longitude,
            newMsg.latitude,
            newMsg.longitude
          );
          if (dist > radius) {
            isWithinRadius = false;
          }
        }

        if (isWithinRadius) {
          displayLocalMessageNotification(newMsg);
        }
      }

      loadMessages();
    }

    function onMessageDeleted() {
      loadMessages();
    }

    function onNewRoom() {
      loadRooms();
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("new_message", onNewMessage);
    socket.on("message_deleted", onMessageDeleted);
    socket.on("new_room", onNewRoom);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("new_message", onNewMessage);
      socket.off("message_deleted", onMessageDeleted);
      socket.off("new_room", onNewRoom);
    };
  }, [user, location, radius]);

  // Busca localização do usuário com reverse geocoding
  async function fetchLocation() {
    try {
      setLoadingLocation(true);
      const data = await getUserCurrentLocation();
      setLocation(data.location);
      setAddress(data.address);
    } catch (error: any) {
      console.log("Erro de localização:", error);
      Alert.alert(
        "Localização necessária",
        "Por favor, habilite a permissão de GPS para ver e enviar mensagens no raio.",
      );
    } finally {
      setLoadingLocation(false);
    }
  }

  // Busca mensagens no raio
  async function loadMessages() {
    if (!location) return;

    try {
      const response = await api.get("/messages", {
        params: {
          latitude: location.latitude,
          longitude: location.longitude,
          radius,
        },
      });

      setMessages(response.data);
    } catch (error) {
      console.log("Erro ao carregar mensagens:", error);
    }
  }

  // Busca salas no raio
  async function loadRooms() {
    if (!location) return;

    try {
      setLoadingRooms(true);
      const response = await api.get("/rooms", {
        params: {
          latitude: location.latitude,
          longitude: location.longitude,
          radius,
        },
      });

      setRooms(response.data);
    } catch (error) {
      console.log("Erro ao carregar salas:", error);
    } finally {
      setLoadingRooms(false);
    }
  }

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    triggerSelection();
    setRefreshing(true);
    await Promise.all([fetchLocation(), loadMessages(), loadRooms()]);
    setRefreshing(false);
  }, [location, radius]);

  // Selecionar / Entrar em uma sala
  async function handleSelectRoom(room: RoomData) {
    if (!user) {
      Alert.alert("Atenção", "Crie seu apelido primeiro para entrar em salas.");
      return;
    }

    if (room.isProtected && room.ownerId !== user.id) {
      setSelectedRoomForPassword(room);
      setPasswordModalVisible(true);
      return;
    }

    try {
      const res = await api.post(`/rooms/${room.id}/join`, {
        userId: user.id,
        nickname: user.nickname,
      });

      setActiveRoomRole(
        res.data.role || (room.ownerId === user.id ? "owner" : "member")
      );
      setActiveRoom(room);
    } catch (err: any) {
      Alert.alert(
        "Erro ao entrar",
        err?.response?.data?.error || "Não foi possível entrar na sala."
      );
    }
  }

  // Confirmar senha da sala
  async function handlePasswordSubmit(password: string) {
    if (!selectedRoomForPassword || !user) return;

    const res = await api.post(`/rooms/${selectedRoomForPassword.id}/join`, {
      userId: user.id,
      nickname: user.nickname,
      password,
    });

    setActiveRoomRole(res.data.role || "member");
    setActiveRoom(selectedRoomForPassword);
  }

  // Criar nova sala
  async function handleCreateRoom(data: {
    name: string;
    description?: string;
    category: string;
    password?: string;
    maxMembers: number;
  }) {
    if (!user) return;

    let coords = location;
    if (!coords) {
      const loc = await getUserCurrentLocation();
      coords = loc.location;
    }

    const res = await api.post("/rooms", {
      ...data,
      ownerId: user.id,
      nickname: user.nickname,
      latitude: coords.latitude,
      longitude: coords.longitude,
      district: address.district,
    });

    await loadRooms();
    setActiveRoomRole("owner");
    setActiveRoom(res.data);
  }

  // Salvar novo usuário
  async function handleSaveUser() {
    if (!nickname.trim()) {
      Alert.alert("Atenção", "Digite um apelido para continuar.");
      return;
    }

    const newUser: User = {
      id: Crypto.randomUUID(),
      nickname: nickname.trim(),
    };

    try {
      await api.post("/users", {
        ...newUser,
        pushToken: pushToken || null,
        latitude: location?.latitude,
        longitude: location?.longitude,
      });
      await saveStoredUser(newUser);
      triggerNotificationSuccess();
      setUser(newUser);
      setNickname("");
    } catch (error: any) {
      console.log("Erro ao salvar usuário:", error);
      Alert.alert("Erro", "Não foi possível conectar ao servidor agora.");
    }
  }

  // Atualizar apelido sem deslogar
  async function handleUpdateNickname(newNickname: string) {
    if (!user) return;
    const updatedUser: User = { id: user.id, nickname: newNickname };
    await api.post("/users", {
      ...updatedUser,
      pushToken: pushToken || null,
      latitude: location?.latitude,
      longitude: location?.longitude,
    });
    await saveStoredUser(updatedUser);
    setUser(updatedUser);
  }

  // Logout / Trocar usuário
  async function handleLogout() {
    triggerImpact("light");
    Alert.alert("Sair da conta", "Deseja trocar de apelido?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          triggerImpact("medium");
          await removeStoredUser();
          setUser(null);
          setNickname("");
          setLocation(null);
        },
      },
    ]);
  }

  // Enviar mensagem (Texto ou Mídia com legenda)
  async function handleSendMessage() {
    if (!user) {
      Alert.alert("Erro", "Usuário não encontrado.");
      return;
    }

    let currentCoords = location;
    if (!currentCoords) {
      try {
        const loc = await getUserCurrentLocation();
        setLocation(loc.location);
        setAddress(loc.address);
        currentCoords = loc.location;
      } catch (err) {
        console.log("Erro ao obter coordenadas:", err);
      }
    }

    if (!currentCoords) {
      Alert.alert("Erro", "Localização indisponível. Tente novamente.");
      return;
    }

    if (!messageText.trim() && !selectedMedia) {
      return;
    }

    setSending(true);

    try {
      if (selectedMedia) {
        // Envio com Mídia (multipart/form-data)
        const formData = new FormData();
        formData.append("userId", user.id);
        formData.append("nickname", user.nickname);
        formData.append("district", address.district || "Local próximo");
        formData.append("latitude", String(currentCoords.latitude));
        formData.append("longitude", String(currentCoords.longitude));
        formData.append("type", selectedMedia.type);

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
          // No navegador Web, precisa ser um Blob real para o Multer processar
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

        // Não passar Content-Type explicitamente no Axios para não sobrescrever o boundary
        await api.post("/messages/media", formData);

        setSelectedMedia(null);
        setMessageText("");
      } else {
        // Envio de texto simples
        await api.post("/messages", {
          userId: user.id,
          nickname: user.nickname,
          district: address.district || "Local próximo",
          text: messageText.trim(),
          latitude: currentCoords.latitude,
          longitude: currentCoords.longitude,
        });

        setMessageText("");
      }

      await loadMessages();
      triggerImpact("medium");
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    } catch (error: any) {
      console.log(
        "Erro ao enviar mensagem:",
        error?.response?.data || error?.message || error
      );
      Alert.alert(
        "Erro ao enviar",
        error?.response?.data?.error || "Não foi possível enviar a mensagem agora."
      );
    } finally {
      setSending(false);
    }
  }

  // Apagar mensagem
  async function handleDeleteMessage(msg: MessageData) {
    if (!user) return;

    Alert.alert("Apagar mensagem", "Deseja apagar esta mensagem?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            triggerImpact("light");
            await api.delete(`/messages/${msg.id}`, {
              data: { userId: user.id },
            });
            await loadMessages();
          } catch (err) {
            Alert.alert("Erro", "Não foi possível apagar a mensagem.");
          }
        },
      },
    ]);
  }

  // Tirar foto com a câmera
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

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setSelectedMedia({
        uri: asset.uri,
        type: "image",
        fileName: asset.fileName ?? undefined,
        mimeType: asset.mimeType ?? "image/jpeg",
      });
    }
  }

  // Gravar vídeo com a câmera
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

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setSelectedMedia({
        uri: asset.uri,
        type: "video",
        fileName: asset.fileName ?? undefined,
        mimeType: asset.mimeType ?? "video/mp4",
      });
    }
  }

  // Escolher foto ou vídeo da galeria
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

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const isVideo = asset.type === "video";
      setSelectedMedia({
        uri: asset.uri,
        type: isVideo ? "video" : "image",
        fileName: asset.fileName ?? undefined,
        mimeType: asset.mimeType ?? (isVideo ? "video/mp4" : "image/jpeg"),
      });
    }
  }

  // Tela de Login / Apelido
  if (!user) {
    return (
      <View style={styles.loginContainer}>
        <View style={styles.loginCard}>
          <View style={styles.loginLogoCircle}>
            <Text style={styles.loginLogoIcon}>📡</Text>
          </View>

          <Text style={styles.loginTitle}>AroundMe</Text>
          <Text style={styles.loginSubtitle}>
            Conecte-se com pessoas e conversas em tempo real ao seu redor.
          </Text>

          <TextInput
            placeholder="Digite seu apelido..."
            placeholderTextColor="#6b7280"
            value={nickname}
            onChangeText={setNickname}
            style={styles.loginInput}
            maxLength={25}
            autoFocus
          />

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleSaveUser}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>Entrar no Chat</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Mensagens filtradas pelo raio
  const filteredMessages = messages.filter((m) => {
    if (typeof m.distance !== "number") return true;
    return m.distance <= radius;
  });

  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      {/* Header Premium com Radar & Status */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerUserSection}
          onPress={() => setProfileModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.brandRow}>
            <Text style={styles.brandTitle}>AroundMe</Text>
            <View
              style={[
                styles.statusDot,
                socketConnected ? styles.statusDotOnline : styles.statusDotOffline,
              ]}
            />
            <Text style={styles.statusText}>
              {socketConnected ? "Ao vivo" : "Conectando..."}
            </Text>
          </View>

          <Text style={styles.headerSubtitle} numberOfLines={1}>
            👤 {user.nickname} · 📍 {address.district}
          </Text>

          {Boolean(address.city) && (
            <Text style={styles.headerLocation}>
              {address.city} {address.region ? `(${address.region})` : ""}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.headerActions}>
          {/* Botão de Raio estilo Tinder */}
          <TouchableOpacity
            style={styles.radiusButton}
            onPress={() => setRadiusModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.radiusIcon}>📡</Text>
            <Text style={styles.radiusButtonText}>{radius} km</Text>
          </TouchableOpacity>

          {/* Perfil */}
          <TouchableOpacity
            onPress={() => setProfileModalVisible(true)}
            style={styles.profileButton}
            activeOpacity={0.7}
          >
            <Text style={styles.profileButtonText}>Perfil</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Barra de Abas: Feed Local vs Salas Próximas */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "feed" && styles.tabButtonActive]}
          onPress={() => {
            triggerSelection();
            setActiveTab("feed");
          }}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === "feed" && styles.tabButtonTextActive,
            ]}
          >
            🌐 Feed Local
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === "rooms" && styles.tabButtonActive]}
          onPress={() => {
            triggerSelection();
            setActiveTab("rooms");
          }}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === "rooms" && styles.tabButtonTextActive,
            ]}
          >
            🏘️ Salas Próximas
          </Text>
          {rooms.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{rooms.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ABA 1: FEED LOCAL */}
      {activeTab === "feed" && (
        <KeyboardAvoidingView
          style={styles.chatArea}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={filteredMessages}
            keyExtractor={(item) => item.id}
            style={styles.messageList}
            contentContainerStyle={styles.messageListContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#3b82f6"
                colors={["#3b82f6"]}
              />
            }
            onContentSizeChange={() => {
              if (filteredMessages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: true });
              }
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🛰️</Text>
                <Text style={styles.emptyTitle}>
                  Nenhuma mensagem no raio de {radius} km
                </Text>
                <Text style={styles.emptySubtitle}>
                  Seja o primeiro a enviar uma mensagem, foto ou vídeo para quem
                  estiver por perto!
                </Text>
                {loadingLocation && (
                  <View style={styles.loadingGpsRow}>
                    <ActivityIndicator size="small" color="#60a5fa" />
                    <Text style={styles.loadingGpsText}>Sintonizando GPS...</Text>
                  </View>
                )}
              </View>
            }
            renderItem={({ item }) => (
              <MessageCard
                message={item}
                currentUserId={user.id}
                onDelete={handleDeleteMessage}
                onPressImage={(url, sender) => {
                  setLightbox({ visible: true, url, sender });
                }}
              />
            )}
          />

          {/* Caixa de Envio Ergonômica Fixada Embaixo */}
          <View style={styles.bottomBar}>
            <SendMessageBox
              value={messageText}
              onChangeText={setMessageText}
              onSend={handleSendMessage}
              onOpenMediaPicker={() => setMediaPickerVisible(true)}
              selectedMedia={selectedMedia}
              onRemoveMedia={() => setSelectedMedia(null)}
              loading={sending}
            />
          </View>
        </KeyboardAvoidingView>
      )}

      {/* ABA 2: SALAS PRÓXIMAS */}
      {activeTab === "rooms" && (
        <View style={styles.roomsContainer}>
          <View style={styles.roomsHeaderRow}>
            <View style={styles.roomsHeaderInfo}>
              <Text style={styles.roomsSectionTitle}>Salas na Região</Text>
              <Text style={styles.roomsSectionSubtitle}>
                No raio de até {radius} km
              </Text>
            </View>

            <TouchableOpacity
              style={styles.createRoomButton}
              onPress={() => {
                triggerImpact("medium");
                setCreateRoomVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.createRoomButtonText}>+ Criar Sala</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={rooms}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.roomsListContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#3b82f6"
                colors={["#3b82f6"]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🏘️</Text>
                <Text style={styles.emptyTitle}>
                  Nenhuma sala criada por perto
                </Text>
                <Text style={styles.emptySubtitle}>
                  Crie a primeira sala da sua região para reunir a vizinhança ou amigos!
                </Text>
                <TouchableOpacity
                  style={[styles.createRoomButton, { marginTop: 14 }]}
                  onPress={() => {
                    triggerImpact("medium");
                    setCreateRoomVisible(true);
                  }}
                >
                  <Text style={styles.createRoomButtonText}>
                    + Criar Sala Agora
                  </Text>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item }) => (
              <RoomCard
                room={item}
                currentUserId={user.id}
                onPress={handleSelectRoom}
              />
            )}
          />
        </View>
      )}

      {/* Modal de Criar Sala */}
      <CreateRoomModal
        visible={createRoomVisible}
        onClose={() => setCreateRoomVisible(false)}
        onCreateRoom={handleCreateRoom}
      />

      {/* Modal de Senha para Entrar em Sala Protegida */}
      <RoomPasswordModal
        visible={passwordModalVisible}
        room={selectedRoomForPassword}
        onClose={() => {
          setPasswordModalVisible(false);
          setSelectedRoomForPassword(null);
        }}
        onSubmit={handlePasswordSubmit}
      />

      {/* Modal de Chat da Sala Ativa */}
      <RoomChatModal
        visible={Boolean(activeRoom)}
        room={activeRoom}
        user={user}
        initialRole={activeRoomRole}
        onClose={() => {
          setActiveRoom(null);
          loadRooms();
        }}
      />

      {/* Modal de Raio Estilo Tinder */}
      <RadiusModal
        visible={radiusModalVisible}
        radius={radius}
        onSelectRadius={setRadius}
        onClose={() => setRadiusModalVisible(false)}
        totalMessagesCount={
          activeTab === "feed" ? filteredMessages.length : rooms.length
        }
      />

      {/* Modal de Escolha de Mídia (Câmera, Vídeo, Galeria) */}
      <MediaPickerModal
        visible={mediaPickerVisible}
        onClose={() => setMediaPickerVisible(false)}
        onSelectCameraPhoto={handleCameraPhoto}
        onSelectCameraVideo={handleCameraVideo}
        onSelectGallery={handleGalleryMedia}
      />

      {/* Modal de Visualização de Imagem em Tela Cheia (Lightbox) */}
      <ImageModal
        visible={lightbox.visible}
        imageUrl={lightbox.url}
        senderName={lightbox.sender}
        onClose={() => setLightbox({ visible: false, url: null, sender: "" })}
      />

      {/* Modal de Perfil do Usuário */}
      <ProfileModal
        visible={profileModalVisible}
        user={user}
        district={address.district}
        city={address.city}
        onClose={() => setProfileModalVisible(false)}
        onUpdateNickname={handleUpdateNickname}
        onLogout={handleLogout}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0d1117",
  },
  loginContainer: {
    flex: 1,
    backgroundColor: "#0d1117",
    justifyContent: "center",
    padding: 24,
  },
  loginCard: {
    backgroundColor: "#161b22",
    borderRadius: 28,
    padding: 28,
    borderWidth: 1,
    borderColor: "#30363d",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  loginLogoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(37, 99, 235, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.4)",
  },
  loginLogoIcon: {
    fontSize: 28,
  },
  loginTitle: {
    color: "#f0f6fc",
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  loginSubtitle: {
    color: "#8b949e",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  loginInput: {
    width: "100%",
    backgroundColor: "#21262d",
    color: "#ffffff",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#30363d",
    marginBottom: 18,
  },
  loginButton: {
    width: "100%",
    backgroundColor: "#2563eb",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  loginButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "#161b22",
    borderBottomWidth: 1,
    borderBottomColor: "#21262d",
  },
  headerUserSection: {
    flex: 1,
    marginRight: 10,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  brandTitle: {
    color: "#f0f6fc",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
  statusDotOnline: {
    backgroundColor: "#10b981",
  },
  statusDotOffline: {
    backgroundColor: "#f59e0b",
  },
  statusText: {
    color: "#8b949e",
    fontSize: 11,
    fontWeight: "500",
  },
  headerSubtitle: {
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  headerLocation: {
    color: "#6b7280",
    fontSize: 11,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  radiusButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    gap: 5,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  radiusIcon: {
    fontSize: 13,
  },
  radiusButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
  profileButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#21262d",
  },
  profileButtonText: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "600",
  },
  chatArea: {
    flex: 1,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 16,
    flexGrow: 1,
  },
  bottomBar: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: "#0d1117",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    marginTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    color: "#f0f6fc",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  emptySubtitle: {
    color: "#8b949e",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  loadingGpsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  loadingGpsText: {
    color: "#60a5fa",
    fontSize: 12,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#161b22",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#21262d",
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "#0d1117",
    borderWidth: 1,
    borderColor: "#30363d",
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: "#1e3a8a",
    borderColor: "#3b82f6",
  },
  tabButtonText: {
    color: "#8b949e",
    fontSize: 13,
    fontWeight: "700",
  },
  tabButtonTextActive: {
    color: "#ffffff",
  },
  tabBadge: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tabBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
  },
  roomsContainer: {
    flex: 1,
    backgroundColor: "#0d1117",
  },
  roomsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#21262d",
  },
  roomsHeaderInfo: {
    flex: 1,
    marginRight: 10,
  },
  roomsSectionTitle: {
    color: "#f0f6fc",
    fontSize: 15,
    fontWeight: "800",
  },
  roomsSectionSubtitle: {
    color: "#8b949e",
    fontSize: 11,
    marginTop: 2,
  },
  createRoomButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  createRoomButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  roomsListContent: {
    padding: 16,
    paddingBottom: 40,
  },
});
