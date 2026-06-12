import * as Crypto from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MessageCard from "../components/MessageCard";
import RadiusModal from "../components/RadiusModal";
import SendMessageBox from "../components/SendMessageBox";
import api from "../services/api";
import { getUserCurrentLocation } from "../services/locationService";
import socket from "../services/socket";
import {
  getStoredUser,
  removeStoredUser,
  saveStoredUser,
} from "../storage/userStorage";
type User = {
  id: string;
  nickname: string;
};

type UserLocation = {
  latitude: number;
  longitude: number;
};

type Message = {
  id: string;
  userId?: string;
  nickname: string;
  district: string;
  text: string;
  distance: number;
  createdAt: string;
};

export default function Home() {
  const [nickname, setNickname] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [radius, setRadius] = useState(5);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [address, setAddress] = useState({
    city: "",
    district: "",
    region: "",
  });
  const scrollViewRef = useRef<ScrollView>(null);
  const [radiusModalVisible, setRadiusModalVisible] = useState(false);

  const [messageText, setMessageText] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);
  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      getCurrentLocation();
    }
  }, [user]);

  useEffect(() => {
    if (location) {
      loadMessages();
    }
  }, [location, radius]);

  useEffect(() => {
    if (!location) return;

    const interval = setInterval(() => {
      loadMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, [location, radius]);

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Socket conectado");
    });

    socket.on("new_message", () => {
      console.log("Nova mensagem");
      loadMessages();
    });

    socket.on("message_deleted", () => {
      console.log("Mensagem apagada");
      loadMessages();
    });

    return () => {
      socket.off("connect");
      socket.off("new_message");
      socket.off("message_deleted");
    };
  }, []);

  async function loadUser() {
    const savedUser = await getStoredUser();

    if (savedUser) {
      setUser(savedUser);
    }
  }

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
      console.log(error);
    }
  }

  async function getCurrentLocation() {
    try {
      setLoadingLocation(true);

      const data = await getUserCurrentLocation();

      setLocation(data.location);
      setAddress(data.address);
    } catch (error: any) {
      console.log("ERRO LOCALIZAÇÃO:", error);
      console.log("MENSAGEM:", error?.message);

      Alert.alert("Erro localização", error?.message || "Erro desconhecido");
    } finally {
      setLoadingLocation(false);
    }
  }

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Socket conectado");
    });

    socket.on("new_message", () => {
      loadMessages();
    });

    socket.on("message_deleted", () => {
      loadMessages();
    });

    return () => {
      socket.off("connect");
      socket.off("new_message");
      socket.off("message_deleted");
    };
  }, [location, radius]);

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>AroundMe</Text>

        <Text style={styles.subtitle}>Escolha um apelido</Text>

        <TextInput
          placeholder="Digite seu nome"
          placeholderTextColor="#888"
          value={nickname}
          onChangeText={setNickname}
          style={styles.input}
        />

        <TouchableOpacity style={styles.button} onPress={saveUser}>
          <Text style={styles.buttonText}>Entrar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function sendMessage() {
    if (!messageText.trim()) {
      Alert.alert("Atenção", "Digite uma mensagem antes de enviar.");
      return;
    }

    if (!user) {
      Alert.alert("Erro", "Usuário não encontrado.");
      return;
    }

    if (!location) {
      Alert.alert(
        "Localização necessária",
        "Atualize sua localização antes de enviar uma mensagem.",
      );
      return;
    }

    try {
      await api.post("/messages", {
        userId: user.id,
        nickname: user.nickname,
        district: address.district || "Local próximo",
        text: messageText.trim(),
        latitude: location.latitude,
        longitude: location.longitude,
      });

      setMessageText("");
    } catch (error: any) {
      console.log("ERRO AO ENVIAR:", error?.message);
      console.log("DETALHES:", error?.response?.data);

      Alert.alert(
        "Erro ao enviar",
        error?.message || "Não foi possível enviar a mensagem.",
      );
    }
  }

  async function saveUser() {
    if (!nickname.trim()) return;

    const newUser: User = {
      id: Crypto.randomUUID(),
      nickname: nickname.trim(),
    };

    try {
      await api.post("/users", newUser);

      await saveStoredUser(newUser);

      setUser(newUser);
      setNickname("");
    } catch (error: any) {
      console.log("ERRO AO SALVAR USUÁRIO:", error?.message);

      Alert.alert("Erro", "Não foi possível criar seu usuário agora.");
    }
  }

  async function logoutUser() {
    await removeStoredUser();

    setUser(null);
    setNickname("");
    setLocation(null);
    setAddress({
      city: "",
      district: "",
      region: "",
    });
  }
  const filteredMessages = messages.filter(
    (message) => message.distance <= radius,
  );

  async function deleteMessage(message: Message) {
    if (!user) return;

    Alert.alert("Apagar mensagem", "Deseja apagar essa mensagem?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          await api.delete(`/messages/${message.id}`, {
            data: {
              userId: user.id,
            },
          });

          loadMessages();
        },
      },
    ]);
  }

  async function pickMedia() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permissão necessária", "Precisamos acessar sua galeria.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];

    const type = asset.type === "video" ? "video" : "image";

    await sendMediaMessage(asset, type);
  }

  async function sendMediaMessage(asset: any, type: "image" | "video") {
    if (!user || !location) {
      Alert.alert("Erro", "Usuário ou localização não encontrada.");
      return;
    }

    const formData = new FormData();

    formData.append("userId", user.id);
    formData.append("nickname", user.nickname);
    formData.append("district", address.district || "Local próximo");
    formData.append("latitude", String(location.latitude));
    formData.append("longitude", String(location.longitude));
    formData.append("type", type);

    formData.append("media", {
      uri: asset.uri,
      name: asset.fileName || `media.${type === "image" ? "jpg" : "mp4"}`,
      type: asset.mimeType || (type === "image" ? "image/jpeg" : "video/mp4"),
    } as any);

    await api.post("/messages/media", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  }
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>AroundMe</Text>

          <Text style={styles.headerSubtitle}>
            {user.nickname} · {address.district || "Buscando localização..."}
          </Text>

          <Text style={styles.headerLocation}>
            {address.city ? `${address.city} - ${address.region}` : ""}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.radiusHeaderButton}
            onPress={() => setRadiusModalVisible(true)}
            onLongPress={() => setRadiusModalVisible(true)}
          >
            <Text style={styles.radiusHeaderText}>{radius} km</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={logoutUser}>
            <Text style={styles.changeNameText}>Trocar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <SendMessageBox
          value={messageText}
          onChangeText={setMessageText}
          onSend={sendMessage}
          onPickMedia={pickMedia}
        />

        <Text style={styles.feedTitle}>Mensagens próximas</Text>

        <ScrollView
          ref={scrollViewRef}
          style={styles.feed}
          showsVerticalScrollIndicator={false}
        >
          {filteredMessages.map((message) => (
            <MessageCard
              key={message.id}
              message={message}
              currentUserId={user.id}
              onDelete={deleteMessage}
            />
          ))}
        </ScrollView>
        {filteredMessages.length === 0 && (
          <Text style={styles.emptyText}>
            Nenhuma mensagem encontrada nesse raio.
          </Text>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={getCurrentLocation}>
          <Text style={styles.buttonText}>
            {loadingLocation ? "Buscando..." : "Atualizar localização"}
          </Text>
        </TouchableOpacity>
      </View>
      <RadiusModal
        visible={radiusModalVisible}
        radius={radius}
        onSelectRadius={setRadius}
        onClose={() => setRadiusModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    color: "#aaa",
    textAlign: "center",
    marginBottom: 20,
    fontSize: 16,
  },
  welcome: {
    color: "#fff",
    textAlign: "center",
    fontSize: 24,
    marginBottom: 15,
  },
  input: {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#2563eb",
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 16,
  },
  radiusText: {
    color: "#aaa",
    fontWeight: "bold",
  },
  radiusTextActive: {
    color: "#fff",
  },
  footerText: {
    color: "#666",
    textAlign: "center",
    marginTop: 20,
  },

  feed: {
    flex: 1,
  },
  changeNameText: {
    color: "#60a5fa",
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "bold",
  },
  screen: {
    flex: 1,
    backgroundColor: "#0f0f0f",
  },

  header: {
    paddingTop: 55,
    paddingHorizontal: 24,
    paddingBottom: 18,
    backgroundColor: "#111",
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  appName: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "bold",
  },

  headerSubtitle: {
    color: "#888",
    marginTop: 4,
  },

  content: {
    flex: 1,
    padding: 20,
  },

  feedTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },

  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#222",
    backgroundColor: "#111",
  },
  emptyText: {
    color: "#666",
    textAlign: "center",
    marginTop: 20,
  },
  headerActions: {
    alignItems: "flex-end",
    gap: 8,
  },

  headerLocation: {
    color: "#666",
    marginTop: 2,
    fontSize: 12,
  },

  radiusHeaderButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },

  radiusHeaderText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
