import Link from "next/link";

export default function NotFound() {
  return (
    <section className="container-shell grid min-h-[70vh] place-items-center py-24 text-center">
      <div>
        <p className="eyebrow">404</p>
        <h1 className="mt-5 text-5xl font-semibold tracking-[-.05em]">
          This page is out of range.
        </h1>
        <p className="mt-5 text-[#586779]">الصفحة التي تبحث عنها غير موجودة.</p>
        <Link href="/" className="primary-button mt-8">
          Back home
        </Link>
      </div>
    </section>
  );
}
