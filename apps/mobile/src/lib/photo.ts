import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";

export const PHOTO_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;
export type PhotoMime = (typeof PHOTO_MIMES)[number];
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export interface PickedPhoto {
  uri: string;
  mime: PhotoMime;
  base64: string;
}

export type PickPhotoResult =
  | { status: "picked"; photo: PickedPhoto }
  | { status: "cancelled" }
  | { status: "error"; reason: "permission" | "invalid" | "tooLarge" | "read" };

function isPhotoMime(value: string): value is PhotoMime {
  return (PHOTO_MIMES as readonly string[]).includes(value);
}

function pickPhotoOnWeb(): Promise<PickPhotoResult> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve({ status: "error", reason: "read" });
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = PHOTO_MIMES.join(",");

    let settled = false;
    const finish = (result: PickPhotoResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        finish({ status: "cancelled" });
        return;
      }
      if (!isPhotoMime(file.type)) {
        finish({ status: "error", reason: "invalid" });
        return;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        finish({ status: "error", reason: "tooLarge" });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === "string" ? reader.result : "";
        const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
        if (!base64) {
          finish({ status: "error", reason: "read" });
          return;
        }
        finish({
          status: "picked",
          photo: { uri: dataUrl, mime: file.type as PhotoMime, base64 },
        });
      };
      reader.onerror = () => finish({ status: "error", reason: "read" });
      reader.readAsDataURL(file);
    };

    input.addEventListener("cancel", () => finish({ status: "cancelled" }));
    input.click();
  });
}

export async function pickPhotoFromLibrary(): Promise<PickPhotoResult> {
  if (Platform.OS === "web") return pickPhotoOnWeb();

  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return { status: "error", reason: "permission" };

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (result.canceled) return { status: "cancelled" };

    const asset = result.assets[0];
    if (!asset?.base64) return { status: "error", reason: "read" };

    const mime = asset.mimeType ?? "image/jpeg";
    if (!isPhotoMime(mime)) return { status: "error", reason: "invalid" };

    const bytes = asset.fileSize ?? Math.ceil((asset.base64.length * 3) / 4);
    if (bytes > MAX_PHOTO_BYTES) return { status: "error", reason: "tooLarge" };

    return {
      status: "picked",
      photo: { uri: asset.uri, mime, base64: asset.base64 },
    };
  } catch {
    return { status: "error", reason: "read" };
  }
}
