"use client";
import { useEffect, useState, useTransition } from "react";
import { Check, Save, ExternalLink, Plus, Trash2 } from "lucide-react";
import { saveSettings } from "@/app/admin/(protected)/settings/actions";
import type { SettingsRecord, SettingsValue } from "@/lib/admin/settings";

type Tree = string | Tree[] | { [key: string]: Tree };
const labels: Record<string, string> = {
  nav: "القائمة الرئيسية",
  home: "الرئيسية",
  services: "الخدمات",
  work: "الأعمال",
  blog: "المقالات",
  about: "من أنا",
  contact: "التواصل",
  availability: "حالة التفرغ للعمل",
  footer: "نص التذييل",
  footerSignature: "توقيع التذييل",
  language: "اسم اللغة الأخرى",
  brandName: "الاسم المعروض",
  brandRole: "المسمى المهني",
  viewProject: "زر عرض المشروع",
  readArticle: "زر قراءة المقال",
  allWork: "زر جميع الأعمال",
  allArticles: "زر جميع المقالات",
  minutes: "وحدة وقت القراءة",
  originalLanguage: "تنويه لغة المقال",
  hero: "المقدمة الرئيسية",
  label: "النص التمهيدي",
  title: "العنوان",
  accentTitle: "الجزء المميز من العنوان",
  description: "الوصف",
  primaryCta: "الزر الرئيسي",
  secondaryCta: "الزر الثانوي",
  benefits: "المزايا",
  detailTitle: "عنوان البطاقة الجانبية",
  detailText: "وصف البطاقة الجانبية",
  cursorLabel: "نص المؤشر الزخرفي",
  artDescription: "وصف الرسم لقارئات الشاشة",
  eyebrow: "العنوان التمهيدي",
  items: "الخدمات المقدمة",
  icon: "الأيقونة",
  text: "النص",
  tag: "التصنيف",
  link: "نص رابط العرض",
  process: "مراحل العمل",
  steps: "الخطوات",
  journal: "أحدث المقالات",
  cta: "الدعوة للتواصل",
  button: "نص الزر",
  seo: "إعدادات SEO والمشاركة",
  siteUrl: "رابط الموقع الأساسي",
  imageUrl: "رابط صورة المشاركة",
  imageAlt: "وصف صورة المشاركة",
  twitterHandle: "حساب X (Twitter)",
  intro: "النص التعريفي",
  storyTitle: "عنوان النبذة",
  story: "النبذة وطريقة العمل",
  values: "مبادئ العمل",
  stackTitle: "عنوان قسم الأدوات",
  stack: "الأدوات والتقنيات",
  promptsTitle: "عنوان نقاط وصف المشروع",
  prompts: "نقاط وصف المشروع",
  cardTitle: "عنوان بطاقة التواصل",
  cardText: "وصف بطاقة التواصل",
  workPrompt: "الدعوة لاستعراض المشاريع",
  workLink: "نص رابط المشاريع",
  form: "نصوص نموذج التواصل",
  name: "تسمية حقل الاسم",
  email: "تسمية حقل البريد الإلكتروني",
  message: "تسمية حقل الرسالة",
  submit: "نص زر الإرسال",
  sending: "النص أثناء الإرسال",
  success: "رسالة نجاح الإرسال",
  error: "رسالة فشل الإرسال",
  invalid: "رسالة البيانات غير الصحيحة",
  rateLimited: "رسالة تجاوز حد الإرسال",
  privacy: "نص الخصوصية",
  hint: "تلميح كتابة الرسالة",
  another: "نص زر إرسال رسالة أخرى",
};
const icons = {
  globe: "موقع إلكتروني",
  layers: "تطبيق / طبقات",
  "shopping-bag": "متجر إلكتروني",
};
const valueIcons = {
  compass: "بوصلة / الاتجاه",
  gauge: "مؤشر / الأداء",
  workflow: "سير العمل",
  code: "الكود / الجودة",
};
const sectionDescriptions = {
  ui: "الهوية، القائمة، التذييل، وإعدادات SEO وتسميات الأزرار في الموقع.",
  home: "نصوص وأقسام الصفحة الرئيسية. المشاريع والمقالات المعروضة تُدار من قسم إدارة المحتوى.",
  about: "النبذة التعريفية، مبادئ العمل وأيقوناتها، والأدوات والتقنيات.",
  contact:
    "مقدمة التواصل، نقاط وصف المشروع، ونصوص النموذج ورسائل نجاح الإرسال وأخطائه.",
};
function Fields({
  value,
  path = [],
  onChange,
  errors,
  locale,
}: {
  value: Tree;
  path?: string[];
  onChange: (path: string[], value: string | string[]) => void;
  errors: Record<string, string>;
  locale: string;
}) {
  if (path.length === 1 && path[0] === "stack" && Array.isArray(value)) {
    return (
      <div>
        <div className="settings-fields">
          {value.map((item, index) => (
            <div key={index}>
              <Fields
                value={item}
                path={[...path, String(index)]}
                onChange={onChange}
                errors={errors}
                locale={locale}
              />
              <button
                type="button"
                className="settings-tool-delete"
                onClick={() =>
                  onChange(
                    path,
                    (value as string[]).filter((_, i) => i !== index),
                  )
                }
              >
                <Trash2 size={14} aria-hidden="true" />
                حذف الأداة {index + 1}
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="settings-tool-add"
          onClick={() => onChange(path, [...(value as string[]), ""])}
        >
          <Plus size={16} aria-hidden="true" />
          إضافة أداة
        </button>
      </div>
    );
  }
  if (typeof value === "string") {
    const name = path.at(-1)!;
    const id = "setting-" + path.join("-");
    const error = errors["value." + path.join(".")];
    const isSeo = path[0] === "seo";
    const isUrl = isSeo && ["siteUrl", "imageUrl"].includes(name);
    const limit = isSeo
      ? ({ title: 120, description: 320, imageAlt: 200, twitterHandle: 16 }[
          name
        ] ?? 2000)
      : 2000;
    const label =
      isSeo && name === "title"
        ? "عنوان الموقع لمحركات البحث"
        : isSeo && name === "description"
          ? "وصف الموقع لمحركات البحث"
          : /^\d+$/.test(name)
            ? (path[0] === "stack"
                ? "الأداة "
                : path[0] === "prompts"
                  ? "النقطة "
                  : "الميزة ") +
              (Number(name) + 1)
            : (labels[name] ?? name);
    return (
      <div className="settings-field">
        <label htmlFor={id}>{label}</label>
        {name === "icon" ? (
          <select
            id={id}
            value={value}
            aria-invalid={!!error}
            aria-describedby={error ? id + "-error" : undefined}
            onChange={(e) => onChange(path, e.target.value)}
          >
            {Object.entries(path[0] === "values" ? valueIcons : icons).map(
              ([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ),
            )}
          </select>
        ) : [
            "description",
            "text",
            "detailText",
            "footer",
            "artDescription",
            "intro",
            "story",
            "cardText",
            "privacy",
            "hint",
            "success",
            "error",
            "invalid",
            "rateLimited",
          ].includes(name) ? (
          <textarea
            id={id}
            value={value}
            dir={locale === "ar" ? "rtl" : "ltr"}
            rows={3}
            required={!isSeo}
            maxLength={limit}
            aria-invalid={!!error}
            aria-describedby={error ? id + "-error" : undefined}
            onChange={(e) => onChange(path, e.target.value)}
          />
        ) : (
          <input
            id={id}
            value={value}
            dir={
              isUrl || name === "twitterHandle"
                ? "ltr"
                : locale === "ar"
                  ? "rtl"
                  : "ltr"
            }
            type={isUrl ? "url" : "text"}
            placeholder={
              isUrl
                ? "https://..."
                : name === "twitterHandle"
                  ? "@username"
                  : undefined
            }
            required={!isSeo}
            maxLength={limit}
            aria-invalid={!!error}
            aria-describedby={error ? id + "-error" : undefined}
            onChange={(e) => onChange(path, e.target.value)}
          />
        )}
        {isSeo && ["title", "description"].includes(name) && (
          <small className="admin-muted">
            {value.length} / {limit} حرفًا
          </small>
        )}
        {error && (
          <span className="admin-error" id={id + "-error"}>
            {error}
          </span>
        )}
      </div>
    );
  }
  return (
    <div className="settings-fields">
      {Object.entries(value).map(([key, item]) => {
        // Legacy field retained in stored content, but no longer rendered publicly.
        if (path.length === 0 && key === "emailLabel") return null;
        const next = [...path, key];
        if (typeof item === "string")
          return (
            <Fields
              key={key}
              value={item}
              path={next}
              onChange={onChange}
              errors={errors}
              locale={locale}
            />
          );
        const title = /^\d+$/.test(key)
          ? (path.includes("steps")
              ? "الخطوة "
              : path.includes("values")
                ? "المبدأ "
                : "الخدمة ") +
            (Number(key) + 1)
          : (labels[key] ?? key);
        return (
          <fieldset key={key} className="settings-group">
            <legend>{title}</legend>
            {key === "seo" && (
              <p className="admin-muted">
                العنوان والوصف للرئيسية، وصورة المشاركة لكل الصفحات. اترك
                العنوان أو الوصف فارغًا لاستخدام هوية الموقع الحالية. يُفضّل
                عنوان من 50–60 حرفًا ووصف من 150–160 حرفًا. أدخل رابط الموقع
                الأساسي نفسه في اللغتين لتوليد الروابط الأساسية للصفحات، وصورة
                عامة برابط كامل (المقاس المقترح 1200×630). الحقول اختيارية.
              </p>
            )}
            <Fields
              value={item}
              path={next}
              onChange={onChange}
              errors={errors}
              locale={locale}
            />
          </fieldset>
        );
      })}
    </div>
  );
}

export function SettingsEditor({ records }: { records: SettingsRecord[] }) {
  const [selected, setSelected] = useState("ui-ar");
  const [saved, setSaved] = useState(records);
  const initial = saved.find((row) => row.key + "-" + row.locale === selected)!;
  const [draft, setDraft] = useState<SettingsValue>(initial.value);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{
    text: string;
    success: boolean;
    conflict?: boolean;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial.value);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    const warnOnNavigation = (event: MouseEvent) => {
      const anchor =
        event.target instanceof Element ? event.target.closest("a") : null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.getAttribute("href")?.startsWith("#") ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      if (!window.confirm("لديك تغييرات غير محفوظة. هل تريد مغادرة الصفحة؟")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", warnOnNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", warnOnNavigation, true);
    };
  }, [dirty]);
  function select(id: string) {
    if (
      pending ||
      id === selected ||
      (dirty && !window.confirm("لديك تغييرات غير محفوظة. هل تريد تجاهلها؟"))
    )
      return;
    setSelected(id);
    setDraft(saved.find((row) => row.key + "-" + row.locale === id)!.value);
    setNotice(null);
    setErrors({});
  }
  function change(path: string[], value: string | string[]) {
    setDraft((current) => {
      const next = structuredClone(current);
      let target = next as unknown as Record<string, unknown>;
      for (const key of path.slice(0, -1))
        target = target[key] as Record<string, unknown>;
      target[path.at(-1)!] = value;
      return next;
    });
    setNotice(null);
    setErrors({});
  }
  return (
    <div className="settings-editor">
      <div className="settings-toolbar">
        <div
          role="group"
          aria-label="نوع الإعدادات"
          className="settings-segments"
        >
          {[
            ["ui", "إعدادات الموقع"],
            ["home", "محتوى الرئيسية"],
            ["about", "من أنا"],
            ["contact", "تواصل"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              disabled={pending}
              aria-pressed={initial.key === key}
              onClick={() => select(key + "-" + initial.locale)}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          role="group"
          aria-label="لغة المحتوى"
          className="settings-segments"
        >
          {[
            ["ar", "العربية"],
            ["en", "English"],
          ].map(([locale, label]) => (
            <button
              key={locale}
              type="button"
              disabled={pending}
              aria-pressed={initial.locale === locale}
              onClick={() => select(initial.key + "-" + locale)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="settings-intro">
        <p className="admin-muted">
          {sectionDescriptions[initial.key]} التغييرات تُنشر مباشرة بعد الحفظ
          للغة المختارة.
        </p>
        <a
          href={
            "/" +
            initial.locale +
            (["about", "contact"].includes(initial.key)
              ? "/" + initial.key
              : "")
          }
          target="_blank"
          rel="noreferrer"
          className="settings-preview"
        >
          <ExternalLink size={16} aria-hidden="true" /> عرض الموقع
        </a>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            setNotice(null);
            setErrors({});
            try {
              const result = await saveSettings({
                key: initial.key,
                locale: initial.locale,
                value: draft,
                version: initial.updated_at,
              });
              if (!result.ok) {
                setErrors(result.fields ?? {});
                setNotice({
                  text: result.message,
                  success: false,
                  conflict: result.conflict,
                });
                return;
              }
              setSaved((rows) =>
                rows.map((row) =>
                  row.key === result.record.key &&
                  row.locale === result.record.locale
                    ? result.record
                    : row,
                ),
              );
              setDraft(result.record.value);
              setNotice({
                text: "تم حفظ التغييرات ونشرها على الموقع.",
                success: true,
              });
            } catch {
              setNotice({
                text: "تعذر الحفظ. تحقق من اتصالك أو أعد تسجيل الدخول ثم حاول مجددًا.",
                success: false,
              });
            }
          });
        }}
      >
        <fieldset disabled={pending} className="settings-form-body">
          <Fields
            value={draft as unknown as Tree}
            onChange={change}
            errors={errors}
            locale={initial.locale}
          />
        </fieldset>
        <div className="settings-savebar">
          <div>
            <span className="settings-save-status">
              {dirty ? "لديك تغييرات غير محفوظة" : "كل التغييرات محفوظة"}
            </span>
            <small>
              آخر تحديث:{" "}
              <time dateTime={initial.updated_at}>
                {new Date(initial.updated_at).toLocaleString("ar-EG", {
                  timeZone: "Africa/Cairo",
                })}
              </time>{" "}
              (القاهرة)
            </small>
          </div>
          <div className="settings-save-actions">
            <button
              type="button"
              className="settings-reset"
              disabled={!dirty || pending}
              onClick={() => {
                if (
                  window.confirm("تجاهل التغييرات والعودة لآخر نسخة محفوظة؟")
                ) {
                  setDraft(initial.value);
                  setErrors({});
                  setNotice(null);
                }
              }}
            >
              تراجع عن التغييرات
            </button>
            <button className="admin-button" disabled={!dirty || pending}>
              <Save size={17} aria-hidden="true" />
              {pending ? "جارٍ الحفظ…" : "حفظ التغييرات"}
            </button>
          </div>
        </div>
        {notice && (
          <div
            role={notice.success ? "status" : "alert"}
            className={
              notice.success
                ? "settings-notice settings-success"
                : "settings-notice admin-error"
            }
          >
            {notice.success && <Check size={18} aria-hidden="true" />}
            {notice.text}
            {notice.conflict && (
              <button
                type="button"
                className="settings-reset"
                onClick={() => {
                  if (
                    window.confirm(
                      "سيتم تجاهل تعديلاتك وتحميل أحدث نسخة. متابعة؟",
                    )
                  ) {
                    setDraft(initial.value);
                    window.location.reload();
                  }
                }}
              >
                تحميل أحدث نسخة
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
