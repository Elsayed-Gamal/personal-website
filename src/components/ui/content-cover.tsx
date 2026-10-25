import Image from "next/image";
import { contentImageUrl } from "@/lib/content-images";

export function ContentCover({
  path,
  url,
  alt,
  className = "",
  sizes,
  contain = false,
}: {
  path: string | null;
  url?: string | null;
  alt: string;
  className?: string;
  sizes: string;
  contain?: boolean;
}) {
  const src = contentImageUrl(path, url);
  if (!src) return null;
  return (
    <div className={`content-cover ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        unoptimized={!path}
        style={{ objectFit: contain ? "contain" : "cover" }}
      />
    </div>
  );
}
