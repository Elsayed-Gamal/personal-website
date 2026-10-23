"use client";
import { useEffect, useState, useTransition } from "react";
import { Check, Save, ExternalLink } from "lucide-react";
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
};
const icons = {
  globe: "موقع إلكتروني",
  layers: "تطبيق / طبقات",
  "shopping-bag": "متجر إلكتروني",
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
  onChange: (path: string[], value: string) => void;
  errors: Record<string, string>;
  locale: string;
}) {
  if (typeof value === "string") {
    const name = path.at(-1)!;
    const id = "setting-" + path.join("-");
    const error = errors["value." + path.join(".")];
    const label = /^\d+$/.test(name)
      ? "الميزة " + (Number(name) + 1)
      : (labels[name] ?? name);
    return (
      <div className="settings-field">
        <label htmlFor={id}>{label}</label>
        {name === "icon" ? (
          <select
            id={id}
            value={value}
            onChange={(e) => onChange(path, e.target.value)}
          >
            {Object.entries(icons).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        ) : [
            "description",
            "text",
            "detailText",
            "footer",
            "artDescription",
          ].includes(name) ? (
          <textarea
            id={id}
            value={value}
            dir={locale === "ar" ? "rtl" : "ltr"}
            rows={3}
            required
            maxLength={2000}
            aria-invalid={!!error}
            aria-describedby={error ? id + "-error" : undefined}
            onChange={(e) => onChange(path, e.target.value)}
          />
        ) : (
          <input
            id={id}
            value={value}
            dir={locale === "ar" ? "rtl" : "ltr"}
            required
            maxLength={2000}
            aria-invalid={!!error}
            aria-describedby={error ? id + "-error" : undefined}
            onChange={(e) => onChange(path, e.target.value)}
          />
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
          ? (path.includes("steps") ? "الخطوة " : "الخدمة ") + (Number(key) + 1)
          : (labels[key] ?? key);
        return (
          <fieldset key={key} className="settings-group">
            <legend>{title}</legend>
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
  function change(path: string[], value: string) {
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
          {initial.key === "ui"
            ? "الهوية، القائمة، التذييل، وتسميات الأزرار في الموقع."
            : "نصوص وأقسام الصفحة الرئيسية. المشاريع والمقالات المعروضة تُدار من قسم إدارة المحتوى."}{" "}
          التغييرات تُنشر مباشرة بعد الحفظ للغة المختارة.
        </p>
        <a
          href={"/" + initial.locale}
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
