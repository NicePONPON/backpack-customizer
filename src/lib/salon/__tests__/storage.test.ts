import { describe, it, expect, beforeAll } from "vitest";
import { photoPublicUrl, productPhotoPath } from "@/lib/salon/storage";

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
});

describe("photoPublicUrl", () => {
  it("builds a public storage URL for a path", () => {
    expect(photoPublicUrl("p1/photo.jpg")).toBe(
      "https://abc.supabase.co/storage/v1/object/public/salon/p1/photo.jpg"
    );
  });
});

describe("productPhotoPath", () => {
  it("namespaces the file under the product id and strips unsafe chars", () => {
    const path = productPhotoPath("p1", "My Photo (1).JPG");
    expect(path.startsWith("p1/")).toBe(true);
    expect(path).toMatch(/^p1\/[0-9]+-my-photo-1\.jpg$/);
  });
});
