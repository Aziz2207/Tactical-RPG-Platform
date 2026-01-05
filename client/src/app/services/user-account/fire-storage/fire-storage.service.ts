import { Injectable } from "@angular/core";
import {
  Storage,
  ref,
  getDownloadURL,
  deleteObject,
  uploadBytes,
  listAll,
  ListResult,
  list,
} from "@angular/fire/storage";

@Injectable({
  providedIn: "root",
})
export class FireStorageService {
  constructor(private storage: Storage) {
    this.fetchAvatars();
  }

  // returns Promise<string[]> of download URLs
  async fetchAvatars(): Promise<string[]> {
    const avatarsRef = ref(this.storage, "images/avatars");
    const avatarsList = await listAll(avatarsRef);
    // map refs -> Promises and await all
    const urlPromises = avatarsList.items.map((itemRef) =>
      getDownloadURL(itemRef)
    );
    return Promise.all(urlPromises);
  }

  // returns Promise<string[]> of download URLs
  async loadAvatar(avatarURL: string) {
    if (avatarURL.startsWith("./asserts/images")) return;
    const avatarRef = ref(this.storage, avatarURL);
    await getDownloadURL(avatarRef);
  }

  async uploadAvatar(imageFile: File): Promise<string> {
    try {
      const resizedFile = await this.resizeImageToSquareNoChecks(
        imageFile,
        1024
      );
      // Create a reference to the storage location for the image
      const imageRef = ref(
        this.storage,
        "images/avatars/" + (await this.nextAvailableName(resizedFile.name))
      );

      // Upload the image file
      const uploadResult = await uploadBytes(imageRef, resizedFile);
      console.log("Image uploaded successfully!", uploadResult);

      // Get the public download URL for the uploaded image
      const downloadURL = await getDownloadURL(uploadResult.ref);
      console.log("Image Download URL:", downloadURL);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  }

  async removeImage(path: string): Promise<void> {
    try {
      // Create a reference to the image to be deleted
      const imageRef = ref(this.storage, path);

      // Delete the image
      await deleteObject(imageRef);
      console.log("Image removed successfully from path:", path);
    } catch (error) {
      console.error("Error removing image:", error);
      // Handle specific errors, e.g., if the file doesn't exist
      if ((error as any).code === "storage/object-not-found") {
        console.warn(
          `Attempted to remove image that does not exist at path: ${path}`
        );
      }
      throw error; // Re-throw to allow component to handle deletion failure
    }
  }

  private async nextAvailableName(name: string) {
    name = (name || "").trim();

    const lastDot = name.lastIndexOf(".");
    const ext = lastDot === -1 ? "" : name.slice(lastDot);
    const nameWithoutExt = lastDot === -1 ? name : name.slice(0, lastDot);

    // Extract base (strip trailing " (N)" if present)
    const trailingRe = /^(.*?)(?:\s*\((\d+)\))?$/;
    const m = nameWithoutExt.match(trailingRe);
    const base = (m && m[1] ? m[1].trim() : nameWithoutExt) || "Untitled";

    // folderRef points to the folder itself; listing this ref yields items directly under it
    const folderRef = ref(this.storage, "images/avatars/");

    const used = new Set<number>();

    // Paginated listing: list returns up to 1000 items per call; iterate using pageToken if provided by SDK
    let pageToken: string | undefined = undefined;
    do {
      // list accepts an optional options object in some SDK versions; if not supported, remove options
      const listResult: ListResult = pageToken
        ? await list(folderRef, { maxResults: 1000, pageToken })
        : await list(folderRef, { maxResults: 1000 });

      // Only consider items that are direct children of folderPath: itemRef.name must NOT contain '/'
      for (const itemRef of listResult.items) {
        const filename = itemRef.name; // name inside folder, does not include folderPath prefix
        if (filename.indexOf("/") !== -1) continue; // defensive: ignore nested paths if any
        if (!filename.endsWith(ext)) continue;
        const nameCore = filename.slice(0, filename.length - ext.length);
        const re = new RegExp(`^${this.escapeRegExp(base)}(?: \\((\\d+)\\))?$`);
        const mm = nameCore.match(re);
        if (!mm) continue;
        const num = mm[1] ? parseInt(mm[1], 10) : 0;
        if (!Number.isNaN(num)) used.add(num);
      }

      pageToken = (listResult as any).nextPageToken;
    } while (pageToken);

    if (!used.has(0)) return base + ext;

    let k = 1;
    while (used.has(k)) k++;
    return `${base} (${k})${ext}`;
  }

  /** Escape regex metacharacters */
  private escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private async resizeImageToSquareNoChecks(
    file: File,
    side: number
  ): Promise<File> {
    const mime = file.type || "image/png";
    const name = file.name || `image.png`;

    const bitmap =
      "createImageBitmap" in window
        ? await createImageBitmap(file)
        : await (async () => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.src = url;
            await img.decode();
            const c = document.createElement("canvas");
            c.width = img.naturalWidth;
            c.height = img.naturalHeight;
            const ctx = c.getContext("2d")!;
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            return await createImageBitmap(c);
          })();

    const srcW = bitmap.width;
    const srcH = bitmap.height;
    const size = Math.min(srcW, srcH);
    const sx = Math.round((srcW - size) / 2);
    const sy = Math.round((srcH - size) / 2);

    const canvas = document.createElement("canvas");
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, side, side);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mime, 0.92)
    );
    if ("close" in bitmap) (bitmap as ImageBitmap).close();

    return new File([blob!], name, { type: mime });
  }
}
