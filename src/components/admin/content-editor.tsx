"use client";
import { useLayoutEffect, useRef, useState, useTransition } from "react";
import {
  ArrowRight,
  BookOpen,
  Bold,
  Code,
  CornerDownLeft,
  Eye,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  ImagePlus,
  Images,
  Italic,
  Link,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Quote,
  Save,
  Strikethrough,
  Table,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { saveContent } from "@/app/admin/(protected)/content/actions";
import type {
  ArticleEdit,
  ContentEntry,
  ContentKind,
  ProjectEdit,
} from "@/lib/admin/content";
import { useUnsavedChanges } from "./use-unsaved-changes";
import { ContentImageField } from "./content-image-field";
import { MediaLibrary } from "./media-library";
import { uploadContentImage } from "@/lib/admin/upload-image";
import { contentImageUrl, IMAGE_TYPES } from "@/lib/content-images";

type Locale = "ar" | "en";
type MarkdownAction =
  | "bold"
  | "italic"
  | "strikethrough"
  | "inline-code"
  | "heading1"
  | "heading2"
  | "heading3"
  | "heading4"
  | "heading5"
  | "heading6"
  | "unordered-list"
  | "ordered-list"
  | "task-list"
  | "link"
  | "image"
  | "image-library"
  | "quote"
  | "code"
  | "table"
  | "footnote"
  | "horizontal-rule"
  | "hard-break";

const markdownTools: {
  action: MarkdownAction;
  label: string;
  icon: typeof Bold;
}[] = [
  { action: "bold", label: "عريض", icon: Bold },
  { action: "italic", label: "مائل", icon: Italic },
  { action: "strikethrough", label: "يتوسطه خط", icon: Strikethrough },
  { action: "inline-code", label: "كود داخل السطر", icon: Code },
  { action: "heading1", label: "عنوان رئيسي", icon: Heading1 },
  { action: "heading2", label: "عنوان فرعي", icon: Heading2 },
  { action: "heading3", label: "عنوان مستوى 3", icon: Heading3 },
  { action: "heading4", label: "عنوان مستوى 4", icon: Heading4 },
  { action: "heading5", label: "عنوان مستوى 5", icon: Heading5 },
  { action: "heading6", label: "عنوان مستوى 6", icon: Heading6 },
  { action: "unordered-list", label: "قائمة نقطية", icon: List },
  { action: "ordered-list", label: "قائمة مرقمة", icon: ListOrdered },
  { action: "task-list", label: "قائمة مهام", icon: ListTodo },
  { action: "link", label: "رابط", icon: Link },
  { action: "image", label: "صورة", icon: ImagePlus },
  { action: "image-library", label: "اختيار صورة من المكتبة أو رفع صورة", icon: Images },
  { action: "quote", label: "اقتباس", icon: Quote },
  { action: "code", label: "كود متعدد الأسطر", icon: Code },
  { action: "table", label: "جدول", icon: Table },
  { action: "footnote", label: "حاشية سفلية", icon: BookOpen },
  { action: "horizontal-rule", label: "فاصل أفقي", icon: Minus },
  { action: "hard-break", label: "سطر جديد", icon: CornerDownLeft },
];

function MarkdownField({
  label,
  name,
  value,
  onChange,
  errors,
  maxLength,
  dir,
  hint,
  kind,
  onBusyChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  errors: Record<string, string>;
  maxLength: number;
  dir: "ltr" | "rtl";
  hint: string;
  kind: ContentKind;
  onBusyChange: (busy: boolean) => void;
}) {
  const id = "content-" + name;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingSelection = useRef<{ start: number; end: number } | null>(null);
  const [notice, setNotice] = useState("");
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [imageUploadBusy, setImageUploadBusy] = useState(false);
  const [imagePickerError, setImagePickerError] = useState("");
  const imageFileInput = useRef<HTMLInputElement>(null);
  const imageInsertionRange = useRef<{ start: number; end: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    const selection = pendingSelection.current;
    const textarea = textareaRef.current;
    if (!selection || !textarea) return;
    textarea.focus();
    textarea.setSelectionRange(selection.start, selection.end);
    pendingSelection.current = null;
  }, [value]);

  function insertImage(url: string) {
    const textarea = textareaRef.current;
    const range = imageInsertionRange.current ?? {
      start: textarea?.selectionStart ?? value.length,
      end: textarea?.selectionEnd ?? value.length,
    };
    const selected = value.slice(range.start, range.end);
    const altText = selected || "وصف الصورة";
    const markdown = `![${altText}](${url})`;
    const nextValue =
      value.slice(0, range.start) + markdown + value.slice(range.end);
    if (nextValue.length > maxLength) {
      const message = "لا يمكن إدراج الصورة لأن المحتوى بلغ الحد الأقصى.";
      setNotice(message);
      setImagePickerError(message);
      return false;
    }
    const altStart = range.start + 2;
    pendingSelection.current = {
      start: altStart,
      end: altStart + altText.length,
    };
    imageInsertionRange.current = null;
    setNotice("");
    setImagePickerError("");
    setImagePickerOpen(false);
    onChange(nextValue);
    return true;
  }

  function openImagePicker() {
    const textarea = textareaRef.current;
    const selectionStart =
      textarea && document.activeElement === textarea
        ? textarea.selectionStart
        : value.length;
    const selectionEnd =
      textarea && document.activeElement === textarea
        ? textarea.selectionEnd
        : value.length;
    imageInsertionRange.current = {
      start: selectionStart,
      end: selectionEnd,
    };
    setImagePickerError("");
    setImagePickerOpen(true);
  }

  async function uploadImage(file: File) {
    setImageUploadBusy(true);
    onBusyChange(true);
    setImagePickerError("");
    try {
      const path = await uploadContentImage(file, kind);
      const url = contentImageUrl(path);
      if (!url) throw new Error("تعذر إنشاء رابط للصورة المرفوعة.");
      insertImage(url);
    } catch (cause) {
      setImagePickerError(
        cause instanceof Error ? cause.message : "تعذر رفع الصورة.",
      );
    } finally {
      setImageUploadBusy(false);
      onBusyChange(false);
    }
  }

  function applyMarkdown(action: MarkdownAction) {
    if (action === "image-library") {
      openImagePicker();
      return;
    }
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    let before = "";
    let after = "";
    let placeholder = "";
    let selectPlaceholder = false;
    let blockPrefix = "";
    let footnoteInsertion: { text: string; selectionStart: number } | null =
      null;

    switch (action) {
      case "bold":
        before = "**";
        after = "**";
        placeholder = "نص عريض";
        break;
      case "italic":
        before = "*";
        after = "*";
        placeholder = "نص مائل";
        break;
      case "strikethrough":
        before = "~~";
        after = "~~";
        placeholder = "نص يتوسطه خط";
        break;
      case "inline-code":
        before = "`";
        after = "`";
        placeholder = "كود";
        break;
      case "heading1":
        blockPrefix = "# ";
        placeholder = "عنوان";
        break;
      case "heading2":
        blockPrefix = "## ";
        placeholder = "عنوان";
        break;
      case "heading3":
        blockPrefix = "### ";
        placeholder = "عنوان";
        break;
      case "heading4":
        blockPrefix = "#### ";
        placeholder = "عنوان";
        break;
      case "heading5":
        blockPrefix = "##### ";
        placeholder = "عنوان";
        break;
      case "heading6":
        blockPrefix = "###### ";
        placeholder = "عنوان";
        break;
      case "unordered-list":
        blockPrefix = "- ";
        placeholder = "عنصر قائمة";
        break;
      case "ordered-list":
        blockPrefix = "1. ";
        placeholder = "عنصر قائمة";
        break;
      case "task-list":
        blockPrefix = "- [ ] ";
        placeholder = "مهمة";
        break;
      case "link":
        before = "[";
        after = "](https://)";
        placeholder = "نص الرابط";
        selectPlaceholder = true;
        break;
      case "image":
        before = "![";
        after = "](https://image-url)";
        placeholder = "وصف الصورة";
        selectPlaceholder = true;
        break;
      case "quote":
        blockPrefix = "> ";
        placeholder = "اقتباس";
        break;
      case "code":
        before = "```\n";
        after = "\n```";
        placeholder = "كود";
        break;
      case "table":
        placeholder =
          "| العمود 1 | العمود 2 |\n| --- | --- |\n| قيمة | قيمة |";
        selectPlaceholder = true;
        break;
      case "footnote": {
        const existingIds = Array.from(
          value.matchAll(/\[\^(\d+)\]/g),
          (match) => Number(match[1]),
        );
        const id = Math.max(0, ...existingIds) + 1;
        const reference = `[^${id}]`;
        const definitionPrefix = `\n\n${reference}: `;
        placeholder = "نص الحاشية";
        footnoteInsertion = {
          text: `${selected}${reference}${definitionPrefix}${placeholder}`,
          selectionStart:
            start + selected.length + reference.length + definitionPrefix.length,
        };
        break;
      }
      case "horizontal-rule":
        placeholder = "---";
        break;
      case "hard-break":
        before = "  \n";
        break;
    }

    const replacement = selected || placeholder;
    let inserted: string;
    let selection: { start: number; end: number };
    if (footnoteInsertion) {
      inserted = footnoteInsertion.text;
      selection = {
        start: footnoteInsertion.selectionStart,
        end: footnoteInsertion.selectionStart + placeholder.length,
      };
    } else if (blockPrefix) {
      const lines = replacement.split("\n");
      inserted = lines.map((line) => blockPrefix + line).join("\n");
      selection = {
        start: start + blockPrefix.length,
        end: start + inserted.length,
      };
    } else {
      inserted = before + replacement + after;
      const contentStart = start + before.length;
      selection = selectPlaceholder
        ? { start: contentStart, end: contentStart + replacement.length }
        : action === "horizontal-rule"
          ? { start: start + inserted.length, end: start + inserted.length }
        : {
            start: selected ? contentStart : contentStart + replacement.length,
            end: selected ? contentStart + replacement.length : contentStart + replacement.length,
          };
    }

    const nextValue = value.slice(0, start) + inserted + value.slice(end);
    if (nextValue.length > maxLength) {
      setNotice("لا يمكن إدراج التنسيق لأن المحتوى بلغ الحد الأقصى.");
      return;
    }
    setNotice("");
    pendingSelection.current = selection;
    onChange(nextValue);
  }

  return (
    <div className="settings-field markdown-field">
      <label htmlFor={id}>{label}</label>
      <div className="markdown-toolbar" role="group" aria-label="أدوات Markdown">
        {markdownTools.map(({ action, label: toolLabel, icon: Icon }) => (
          <button
            key={action}
            type="button"
            aria-label={toolLabel}
            title={toolLabel}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyMarkdown(action)}
          >
            <Icon size={17} aria-hidden="true" />
          </button>
        ))}
      </div>
      {imagePickerOpen && (
        <div
          className="markdown-image-overlay"
          onKeyDown={(event) => {
            if (event.key === "Escape" && !imageUploadBusy)
              setImagePickerOpen(false);
          }}
        >
          <section
            className="markdown-image-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={id + "-image-dialog-title"}
          >
            <div className="markdown-image-dialog-heading">
              <h3 id={id + "-image-dialog-title"}>إدراج صورة في المحتوى</h3>
              <button
                type="button"
                className="settings-reset"
                disabled={imageUploadBusy}
                onClick={() => setImagePickerOpen(false)}
              >
                إغلاق
              </button>
            </div>
            <div className="markdown-image-upload">
              <input
                ref={imageFileInput}
                type="file"
                accept={Object.keys(IMAGE_TYPES).join(",")}
                aria-label="رفع صورة للمكتبة"
                hidden
                disabled={imageUploadBusy}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (file) void uploadImage(file);
                }}
              />
              <button
                type="button"
                className="admin-button"
                disabled={imageUploadBusy}
                onClick={() => imageFileInput.current?.click()}
              >
                <ImagePlus size={17} aria-hidden="true" />
                {imageUploadBusy ? "جارٍ رفع الصورة…" : "رفع صورة جديدة"}
              </button>
              <small className="admin-muted">
                JPG أو PNG أو WebP، بحد أقصى 5 ميجابايت.
              </small>
            </div>
            {imagePickerError && (
              <p role="alert" className="settings-notice admin-error">
                {imagePickerError}
              </p>
            )}
            <MediaLibrary
              disabled={imageUploadBusy}
              onSelect={(image) => {
                const url = contentImageUrl(image.path);
                if (url) insertImage(url);
                else
                  setImagePickerError("تعذر إنشاء رابط للصورة المختارة.");
              }}
            />
          </section>
        </div>
      )}
      <textarea
        ref={textareaRef}
        id={id}
        rows={18}
        value={value}
        onChange={(event) => {
          setNotice("");
          onChange(event.target.value);
        }}
        maxLength={maxLength}
        dir={dir}
        aria-invalid={!!errors[name]}
        aria-describedby={id + "-hint"}
      />
      <small
        id={id + "-hint"}
        className={errors[name] ? "admin-error" : "admin-muted"}
      >
        {errors[name] || hint}
      </small>
      {notice && (
        <small role="alert" className="admin-error">
          {notice}
        </small>
      )}
    </div>
  );
}

function Input({
  label,
  name,
  value,
  onChange,
  errors,
  multiline = false,
  type = "text",
  readOnly = false,
  maxLength = 200,
  dir,
  hint,
}: {
  label: string;
  name: string;
  value: string | number;
  onChange: (value: string) => void;
  errors: Record<string, string>;
  multiline?: boolean;
  type?: string;
  readOnly?: boolean;
  maxLength?: number;
  dir?: "ltr" | "rtl";
  hint?: string;
}) {
  const id = "content-" + name;
  return (
    <div className="settings-field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea
          id={id}
          rows={name.endsWith("body") ? 18 : 3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          dir={dir}
          aria-invalid={!!errors[name]}
          aria-describedby={id + "-hint"}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          maxLength={maxLength}
          dir={dir}
          aria-invalid={!!errors[name]}
          aria-describedby={id + "-hint"}
        />
      )}
      <small
        id={id + "-hint"}
        className={errors[name] ? "admin-error" : "admin-muted"}
      >
        {errors[name] || hint}
      </small>
    </div>
  );
}
export function ContentEditor({
  entry,
  onSaved,
  onClose,
}: {
  entry: ContentEntry;
  onSaved: (entry: ContentEntry) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(entry);
  const [original, setOriginal] = useState(entry);
  const [stackInput, setStackInput] = useState(
    entry.kind === "project" ? entry.stack.join(", ") : "",
  );
  const [language, setLanguage] = useState<Locale>(
    entry.translations[0].locale,
  );
  const [preview, setPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{
    text: string;
    ok: boolean;
    conflict?: boolean;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const busy = pending || uploading;
  const dirty = JSON.stringify(draft) !== JSON.stringify(original);
  useUnsavedChanges(dirty || uploading);
  const idx = draft.translations.findIndex((t) => t.locale === language);
  const translation = draft.translations[idx];
  const prefix = "translations." + idx + ".";
  function patch(values: Record<string, unknown>) {
    setDraft((current) => ({ ...current, ...values }) as ContentEntry);
    setNotice(null);
    setErrors({});
  }
  function patchTranslation(values: Record<string, unknown>) {
    setDraft(
      (current) =>
        ({
          ...current,
          translations: current.translations.map((t) =>
            t.locale === language ? { ...t, ...values } : t,
          ),
        }) as ContentEntry,
    );
    setNotice(null);
    setErrors({});
  }
  function close() {
    if (!busy && (!dirty || window.confirm("تجاهل التعديلات غير المحفوظة؟")))
      onClose();
  }
  function addLanguage() {
    if (draft.kind !== "article") return;
    const locale = draft.translations.some((t) => t.locale === "ar")
      ? "en"
      : "ar";
    patch({
      translations: [
        ...draft.translations,
        (original.kind === "article" &&
          original.translations.find((t) => t.locale === locale)) || {
          locale,
          slug: "",
          title: "",
          excerpt: "",
          body: "",
          published: true,
        },
      ],
    });
    setLanguage(locale);
    setPreview(false);
  }
  function removeLanguage() {
    if (
      draft.kind !== "article" ||
      draft.translations.length < 2 ||
      !window.confirm("حذف هذه الترجمة؟ ستُزال من الموقع عند حفظ التغييرات.")
    )
      return;
    const remaining = draft.translations.filter((t) => t.locale !== language);
    patch({ translations: remaining });
    setLanguage(remaining[0].locale);
  }
  return (
    <section className="content-editor">
      <div className="content-editor-heading">
        <button
          type="button"
          className="settings-reset"
          onClick={close}
          disabled={busy}
        >
          <ArrowRight size={17} /> العودة للقائمة
        </button>
        <h2>
          {original.updated_at ? "تعديل" : "إضافة"}{" "}
          {draft.kind === "article" ? "مقال" : "مشروع"}
        </h2>
        <span className="admin-badge">
          {original.updated_at
            ? original.published
              ? "منشور حاليًا"
              : "مسودة محفوظة"
            : "محتوى جديد"}
        </span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (busy) return;
          startTransition(async () => {
            setNotice(null);
            setErrors({});
            try {
              const result = await saveContent(draft);
              if (!result.ok) {
                setNotice({
                  text: result.message,
                  ok: false,
                  conflict: result.conflict,
                });
                setErrors(result.fields ?? {});
                const field = Object.keys(result.fields ?? {}).find((key) =>
                  key.startsWith("translations."),
                );
                const errorIndex = field ? Number(field.split(".")[1]) : NaN;
                if (
                  Number.isInteger(errorIndex) &&
                  draft.translations[errorIndex]
                )
                  setLanguage(draft.translations[errorIndex].locale);
                setPreview(false);
                return;
              }
              setDraft(result.entry);
              setOriginal(result.entry);
              onSaved(result.entry);
              setNotice({
                text: result.entry.published
                  ? "تم حفظ المحتوى ونشره."
                  : "تم حفظ المسودة. لن تظهر للزوار.",
                ok: true,
              });
            } catch {
              setNotice({
                text: "تعذر الحفظ. تحقق من الاتصال وأعد المحاولة.",
                ok: false,
              });
            }
          });
        }}
      >
        <fieldset disabled={busy} className="settings-form-body">
          <ContentImageField
            entry={draft}
            disabled={pending}
            busy={uploading}
            onBusyChange={setUploading}
            onChange={patch}
          />
          <div className="settings-group">
            <h3>بيانات {draft.kind === "article" ? "المقال" : "المشروع"}</h3>
            <div className="settings-fields">
              <div className="settings-field">
                <label htmlFor="content-status">حالة النشر</label>
                <select
                  id="content-status"
                  value={draft.published ? "published" : "draft"}
                  onChange={(e) =>
                    patch({ published: e.target.value === "published" })
                  }
                >
                  <option value="draft">مسودة — مخفية عن الزوار</option>
                  <option value="published">منشور — ظاهر على الموقع</option>
                </select>
                <small className="admin-muted">
                  تتغير الحالة عند حفظ التغييرات.
                </small>
              </div>
              {draft.kind === "article" ? (
                <>
                  <Input
                    label="تاريخ المقال"
                    name="date"
                    type="date"
                    value={draft.date}
                    onChange={(date) => patch({ date })}
                    errors={errors}
                  />
                  <Input
                    label="وقت القراءة بالدقائق"
                    name="reading_time"
                    type="number"
                    value={draft.reading_time}
                    onChange={(v) => patch({ reading_time: Number(v) })}
                    errors={errors}
                  />
                  {(["ar", "en"] as const).map((locale) => (
                    <Input
                      key={locale}
                      label={
                        "التصنيف " +
                        (locale === "ar" ? "بالعربية" : "بالإنجليزية")
                      }
                      name={"category." + locale}
                      value={draft.category[locale]}
                      onChange={(v) =>
                        patch({ category: { ...draft.category, [locale]: v } })
                      }
                      errors={errors}
                      dir={locale === "ar" ? "rtl" : "ltr"}
                      hint="يكفي تصنيف بلغة واحدة؛ يُستخدم للغة الأخرى عند تركها فارغة."
                    />
                  ))}
                </>
              ) : (
                <>
                  <Input
                    label="رابط المشروع"
                    name="id"
                    value={draft.id}
                    onChange={(id) => patch({ id })}
                    errors={errors}
                    readOnly={!!original.updated_at}
                    dir="ltr"
                    maxLength={180}
                    hint="حروف وأرقام وشرطة بدون مسافات. يثبت بعد الإنشاء لحماية الروابط."
                  />
                  <Input
                    label="سنة المشروع"
                    name="year"
                    value={draft.year}
                    onChange={(year) => patch({ year })}
                    errors={errors}
                    maxLength={4}
                  />
                  <Input
                    label="ترتيب العرض"
                    name="sort_order"
                    type="number"
                    value={draft.sort_order}
                    onChange={(v) => patch({ sort_order: Number(v) })}
                    errors={errors}
                    hint="الأرقام الأصغر تظهر أولًا."
                  />
                  <div className="settings-field">
                    <label htmlFor="project-color">لون بطاقة المشروع</label>
                    <select
                      id="project-color"
                      value={draft.color}
                      onChange={(e) => patch({ color: e.target.value })}
                    >
                      <option value="cyan">أزرق سماوي</option>
                      <option value="violet">بنفسجي</option>
                      <option value="amber">كهرماني</option>
                    </select>
                  </div>
                  <Input
                    label="التقنيات المستخدمة"
                    name="stack"
                    value={stackInput}
                    onChange={(value) => {
                      setStackInput(value);
                      patch({
                        stack: value
                          .split(/[,،]/)
                          .map((t) => t.trim())
                          .filter(Boolean),
                      });
                    }}
                    errors={errors}
                    maxLength={1800}
                    hint="افصل بين التقنيات بفاصلة، مثل: Next.js, Supabase"
                    dir="ltr"
                  />
                </>
              )}
            </div>
          </div>
          <div className="content-language-toolbar">
            <div
              role="group"
              aria-label="لغة الترجمة"
              className="settings-segments"
            >
              {draft.translations.map((t) => (
                <button
                  type="button"
                  key={t.locale}
                  aria-pressed={language === t.locale}
                  onClick={() => {
                    setLanguage(t.locale);
                    setPreview(false);
                  }}
                >
                  {t.locale === "ar" ? "العربية" : "English"}
                </button>
              ))}
            </div>
            {draft.kind === "article" && (
              <div>
                {draft.translations.length < 2 ? (
                  <button
                    type="button"
                    className="settings-reset"
                    onClick={addLanguage}
                  >
                    + إضافة الترجمة الثانية
                  </button>
                ) : (
                  <button
                    type="button"
                    className="content-danger"
                    onClick={removeLanguage}
                  >
                    إزالة الترجمة الحالية
                  </button>
                )}
              </div>
            )}
          </div>
          <p className="admin-muted">
            {draft.kind === "article"
              ? "يمكن نشر المقال بلغة واحدة، وإضافة الترجمة الثانية لاحقًا. الترجمة المخفية لا تظهر للزوار."
              : "يحتاج المشروع المنشور إلى بيانات مكتملة بالعربية والإنجليزية. يمكنك حفظ مسودة أثناء العمل."}
          </p>
          {translation && (
            <div className="settings-group">
              <div className="content-preview-toolbar">
                <h3>
                  {language === "ar" ? "المحتوى العربي" : "المحتوى الإنجليزي"}
                </h3>
                <button
                  type="button"
                  className="settings-reset"
                  onClick={() => setPreview(!preview)}
                >
                  <Eye size={17} />
                  {preview ? "العودة للتحرير" : "معاينة المحتوى"}
                </button>
              </div>
              {preview ? (
                <div
                  className="content-preview article-body"
                  dir={language === "ar" ? "rtl" : "ltr"}
                >
                  <h2>{translation.title || "بدون عنوان"}</h2>
                  {draft.kind === "article" ? (
                    <>
                      <p>
                        {
                          (translation as ArticleEdit["translations"][number])
                            .excerpt
                        }
                      </p>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeSanitize]}
                      >
                        {translation.body}
                      </ReactMarkdown>
                    </>
                  ) : (
                    <>
                      <p>
                        {
                          (translation as ProjectEdit["translations"][number])
                            .summary
                        }
                      </p>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeSanitize]}
                      >
                        {translation.body}
                      </ReactMarkdown>
                    </>
                  )}
                </div>
              ) : (
                <div className="settings-fields">
                  <Input
                    label="العنوان"
                    name={prefix + "title"}
                    value={translation.title}
                    onChange={(title) => patchTranslation({ title })}
                    errors={errors}
                    dir={language === "ar" ? "rtl" : "ltr"}
                  />
                  {draft.kind === "article" ? (
                    <>
                      <Input
                        label="رابط المقال"
                        name={prefix + "slug"}
                        value={
                          (translation as ArticleEdit["translations"][number])
                            .slug
                        }
                        onChange={(slug) => patchTranslation({ slug })}
                        errors={errors}
                        dir="ltr"
                        maxLength={180}
                        readOnly={
                          !!original.updated_at &&
                          original.kind === "article" &&
                          original.translations.some(
                            (t) => t.locale === language,
                          )
                        }
                        hint="رابط مختلف لكل لغة. ثابت بعد حفظ الترجمة."
                      />
                      <label className="content-checkbox">
                        <input
                          type="checkbox"
                          checked={
                            (translation as ArticleEdit["translations"][number])
                              .published
                          }
                          onChange={(e) =>
                            patchTranslation({ published: e.target.checked })
                          }
                        />{" "}
                        إتاحة هذه الترجمة عند نشر المقال
                      </label>
                      <div className="content-full">
                        <Input
                          label="ملخص المقال"
                          name={prefix + "excerpt"}
                          value={
                            (translation as ArticleEdit["translations"][number])
                              .excerpt
                          }
                          onChange={(excerpt) => patchTranslation({ excerpt })}
                          errors={errors}
                          multiline
                          maxLength={2000}
                          dir={language === "ar" ? "rtl" : "ltr"}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <Input
                        label="تصنيف المشروع"
                        name={prefix + "category"}
                        value={
                          (translation as ProjectEdit["translations"][number])
                            .category
                        }
                        onChange={(category) => patchTranslation({ category })}
                        errors={errors}
                        dir={language === "ar" ? "rtl" : "ltr"}
                      />
                      <div className="content-full">
                        <Input
                          label="ملخص المشروع"
                          name={prefix + "summary"}
                          value={
                            (translation as ProjectEdit["translations"][number])
                              .summary
                          }
                          onChange={(summary) => patchTranslation({ summary })}
                          errors={errors}
                          multiline
                          maxLength={2000}
                          dir={language === "ar" ? "rtl" : "ltr"}
                        />
                      </div>
                    </>
                  )}
                  <div className="content-full">
                    <MarkdownField
                      label={
                        draft.kind === "article"
                          ? "نص المقال (Markdown)"
                          : "تفاصيل المشروع (Markdown)"
                      }
                      name={prefix + "body"}
                      value={translation.body}
                      onChange={(body) => patchTranslation({ body })}
                      errors={errors}
                      maxLength={80000}
                      dir={language === "ar" ? "rtl" : "ltr"}
                      hint="يدعم العناوين والقوائم والروابط والجداول والاقتباسات وأكواد البرمجة بصيغة Markdown."
                      kind={draft.kind}
                      onBusyChange={setUploading}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </fieldset>
        {Object.keys(errors).length > 0 && (
          <div className="settings-notice admin-error" role="alert">
            <ul>
              {Array.from(new Set(Object.values(errors))).map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="settings-savebar">
          <div>
            <span className="settings-save-status">
              {dirty || !original.updated_at
                ? "تغييرات غير محفوظة"
                : "كل التغييرات محفوظة"}
            </span>
            <small>
              {draft.published
                ? "سيظهر المحتوى للزوار بعد الحفظ."
                : "سيُحفظ المحتوى كمسودة مخفية."}
            </small>
          </div>
          <div className="settings-save-actions">
            <button
              type="button"
              className="settings-reset"
              disabled={busy}
              onClick={close}
            >
              إغلاق
            </button>
            <button
              className="admin-button"
              disabled={busy || (!dirty && !!original.updated_at)}
            >
              <Save size={17} />
              {pending
                ? "جارٍ الحفظ…"
                : draft.published
                  ? "حفظ ونشر"
                  : "حفظ المسودة"}
            </button>
          </div>
        </div>
        {notice && (
          <div
            role={notice.ok ? "status" : "alert"}
            className={
              notice.ok
                ? "settings-notice settings-success"
                : "settings-notice admin-error"
            }
          >
            {notice.text}
            {notice.conflict && (
              <button
                type="button"
                className="settings-reset"
                onClick={() => {
                  if (window.confirm("تحميل أحدث نسخة وتجاهل التعديلات؟"))
                    window.location.reload();
                }}
              >
                تحميل أحدث نسخة
              </button>
            )}
          </div>
        )}
      </form>
    </section>
  );
}
