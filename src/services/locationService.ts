import * as Location from "expo-location";

export interface LocationResult {
  location: {
    latitude: number;
    longitude: number;
  };
  address: {
    city: string;
    district: string;
    region: string;
  };
}

function getDefaultLocation(): Location.LocationObject {
  return {
    coords: {
      latitude: -18.9186,
      longitude: -48.2772,
      altitude: null,
      accuracy: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  };
}

export async function getUserCurrentLocation(): Promise<LocationResult> {
  let hasPermission = false;

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    hasPermission = status === "granted";
  } catch (err) {
    console.log("Erro ao pedir permissão de GPS:", err);
  }

  let currentLocation: Location.LocationObject;

  if (hasPermission) {
    try {
      // Tenta pegar a última posição conhecida primeiro (resposta instantânea no emulador e dispositivo)
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        currentLocation = lastKnown;
      } else {
        currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      }
    } catch (error) {
      console.log("GPS indisponível ao obter posição, tentando getLastKnown:", error);
      try {
        const fallback = await Location.getLastKnownPositionAsync();
        if (fallback) {
          currentLocation = fallback;
        } else {
          currentLocation = getDefaultLocation();
        }
      } catch (e2) {
        currentLocation = getDefaultLocation();
      }
    }
  } else {
    console.log("Sem permissão ou rodando na Web, usando localização padrão");
    currentLocation = getDefaultLocation();
  }

  const coords = {
    latitude: currentLocation.coords.latitude,
    longitude: currentLocation.coords.longitude,
  };

  let address = {
    city: "",
    district: "Local próximo",
    region: "",
  };

  try {
    const geo = await Location.reverseGeocodeAsync(coords);
    if (geo && geo.length > 0) {
      const place = geo[0];
      address = {
        city: place.city || place.subregion || "",
        district: place.district || place.name || "Local próximo",
        region: place.region || "",
      };
    }
  } catch (err) {
    console.log("Reverse geocode indisponível:", err);
  }

  return {
    location: coords,
    address,
  };
}

/**
 * Calcula a distância em km entre duas coordenadas geográficas (fórmula de Haversine).
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
