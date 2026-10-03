import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Retorna a URL base da API dinamicamente:
 * 1. Se EXPO_PUBLIC_API_URL estiver definida no .env, usa ela.
 * 2. Em dispositivo físico via Expo Go / Dev Client, pega o IP da máquina local através do hostUri.
 * 3. No emulador Android usa 10.0.2.2:3333.
 * 4. No simulador iOS ou Web usa localhost:3333.
 */
export function getBaseUrl(): string {
  // Em modo de desenvolvimento, conecta no servidor local da API
  if (__DEV__) {
    return Platform.OS === "android" ? "http://10.0.2.2:3333" : "http://localhost:3333";
  }

  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // No navegador (Web), sempre conectar diretamente ao localhost do computador
  if (Platform.OS === "web") {
    return "http://localhost:3333";
  }

  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as any).manifest2?.extra?.expoClient?.hostUri ??
    (Constants as any).expoGoConfig?.debuggerHost;

  if (hostUri) {
    const lanIp = hostUri.split(":")[0];
    if (lanIp && lanIp !== "localhost" && lanIp !== "127.0.0.1") {
      return `http://${lanIp}:3333`;
    }
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:3333";
  }

  return "http://localhost:3333";
}

/**
 * Normaliza URLs de imagem e vídeo para garantir que funcionem em qualquer ambiente
 * (dispositivo físico, emulador, web ou produção).
 */
export function resolveMediaUrl(mediaUrl?: string | null): string | null {
  if (!mediaUrl) return null;

  const baseUrl = getBaseUrl();

  if (mediaUrl.startsWith("/uploads/")) {
    return `${baseUrl}${mediaUrl}`;
  }

  if (mediaUrl.includes("10.0.2.2:3333")) {
    return mediaUrl.replace("http://10.0.2.2:3333", baseUrl);
  }

  if (mediaUrl.includes("localhost:3333")) {
    return mediaUrl.replace("http://localhost:3333", baseUrl);
  }

  return mediaUrl;
}
