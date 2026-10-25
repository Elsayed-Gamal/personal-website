import Image from "next/image";
import { contentImageUrl } from "@/lib/content-images";

export function ContentCover({
  path,
  alt,
  className = "",
  sizes,
  contain = false,
}: {
  path: string | null;
  alt: string;
  className?: string;
  sizes: string;
  contain?: boolean;
}) {
  const src = contentImageUrl(path);
  if (!src) return null;
  return (
    <div className={`content-cover ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        style={{ objectFit: contain ? "contain" : "cover" }}
      />
    </div>
  );
}
