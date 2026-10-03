import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { MessageData } from "../components/MessageCard";

// Configuração do comportamento da notificação quando o app está em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const MESSAGES_CHANNEL_ID = "messages";

/**
 * Cria o canal de notificações no Android para garantir som e prioridade máxima (Heads-up banner)
 */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(MESSAGES_CHANNEL_ID, {
      name: "Mensagens Próximas",
      description: "Notificações de novas conversas e mídias no seu raio",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#00f2fe",
      showBadge: true,
      enableVibrate: true,
    });
  }
}

/**
 * Solicita permissões e obtém o Expo Push Token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  try {
    await setupNotificationChannels();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[Notifications] Permissão para notificações não foi concedida.");
      return null;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId ??
      "08626672-a715-44bb-96a7-34e071560ed4";

    const pushTokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    return pushTokenData.data;
  } catch (error) {
    console.log("[Notifications] Erro ao obter Expo Push Token:", error);
    return null;
  }
}

/**
 * Dispara uma notificação local no dispositivo para novas mensagens no raio
 */
export async function displayLocalMessageNotification(
  message: MessageData
): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const title = `💬 ${message.nickname}${
      message.district ? ` (${message.district})` : ""
    }`;

    let body = "Nova mensagem no seu raio";
    if (message.type === "image") {
      body = message.text ? `📷 ${message.text}` : "📷 Enviou uma foto";
    } else if (message.type === "video") {
      body = message.text ? `🎥 ${message.text}` : "🎥 Enviou um vídeo";
    } else if (message.text) {
      body = message.text;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          messageId: message.id,
          userId: message.userId,
        },
      },
      trigger:
        Platform.OS === "android"
          ? { channelId: MESSAGES_CHANNEL_ID }
          : null,
    });
  } catch (error) {
    console.log("[Notifications] Erro ao agendar notificação local:", error);
  }
}
