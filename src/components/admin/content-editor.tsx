"use client";
import { useState, useTransition } from "react";
import { ArrowRight, Eye, Save } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { saveContent } from "@/app/admin/(protected)/content/actions";
import type {
  ArticleEdit,
  ContentEntry,
  ProjectEdit,
} from "@/lib/admin/content";
import { useUnsavedChanges } from "./use-unsaved-changes";

type Locale = "ar" | "en";
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
  const dirty = JSON.stringify(draft) !== JSON.stringify(original);
  useUnsavedChanges(dirty);
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
    if (!pending && (!dirty || window.confirm("تجاهل التعديلات غير المحفوظة؟")))
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
          disabled={pending}
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
        <fieldset disabled={pending} className="settings-form-body">
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
                      <div className="content-plain-body">
                        {translation.body}
                      </div>
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
                    <Input
                      label={
                        draft.kind === "article"
                          ? "نص المقال (Markdown)"
                          : "تفاصيل المشروع"
                      }
                      name={prefix + "body"}
                      value={translation.body}
                      onChange={(body) => patchTranslation({ body })}
                      errors={errors}
                      multiline
                      maxLength={80000}
                      dir={language === "ar" ? "rtl" : "ltr"}
                      hint={
                        draft.kind === "article"
                          ? "يدعم العناوين والقوائم والروابط وأكواد البرمجة بصيغة Markdown."
                          : "اكتب وصف المشروع ودورك فيه والنتائج."
                      }
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
              disabled={pending}
              onClick={close}
            >
              إغلاق
            </button>
            <button
              className="admin-button"
              disabled={pending || (!dirty && !!original.updated_at)}
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
