import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import Image from "next/image";
import { contentImageUrl, coverSourceFromUrl } from "@/lib/content-images";

function MarkdownImage({ src, alt }: { src?: string | Blob; alt?: string }) {
  if (typeof src !== "string" || !src) return null;
  let optimized = false;
  try {
    const path = coverSourceFromUrl(src).cover_image_path;
    optimized = !!path;
    if (path) src = contentImageUrl(path)!;
  } catch {
    /* External Markdown image. */
  }
  return (
    <span
      style={{
        display: "block",
        position: "relative",
        aspectRatio: "16 / 9",
        width: "100%",
      }}
    >
      <Image
        src={src}
        alt={alt ?? ""}
        fill
        sizes="(max-width: 767px) 90vw, 768px"
        unoptimized={!optimized}
        loading="lazy"
        style={{ objectFit: "contain" }}
      />
    </span>
  );
}
export function MarkdownContent({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
      components={{ img: MarkdownImage }}
    >
      {children}
    </ReactMarkdown>
  );
}
