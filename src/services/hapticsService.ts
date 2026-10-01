import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

/**
 * Dispara vibração tátil sutil de impacto.
 * Seguro em todas as plataformas (web não quebra).
 */
export async function triggerImpact(
  style: "light" | "medium" | "heavy" = "medium"
): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const feedbackStyle =
      style === "light"
        ? Haptics.ImpactFeedbackStyle.Light
        : style === "heavy"
        ? Haptics.ImpactFeedbackStyle.Heavy
        : Haptics.ImpactFeedbackStyle.Medium;

    await Haptics.impactAsync(feedbackStyle);
  } catch (error) {
    console.log("[Haptics] Erro ao vibrar impacto:", error);
  }
}

/**
 * Dispara vibração de sucesso (ex: nova mensagem recebida).
 */
export async function triggerNotificationSuccess(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (error) {
    console.log("[Haptics] Erro ao vibrar sucesso:", error);
  }
}

/**
 * Dispara vibração de aviso ou erro.
 */
export async function triggerNotificationWarning(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch (error) {
    console.log("[Haptics] Erro ao vibrar aviso:", error);
  }
}

/**
 * Dispara vibração de seleção rápida (ex: alternar filtros, raio, tabs).
 */
export async function triggerSelection(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    await Haptics.selectionAsync();
  } catch (error) {
    console.log("[Haptics] Erro na seleção tátil:", error);
  }
}
