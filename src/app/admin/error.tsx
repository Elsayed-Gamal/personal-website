"use client";
export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <main className="admin-login">
      <section className="admin-login-card">
        <h1>تعذر تحميل الصفحة</h1>
        <p>حاول مرة أخرى بعد قليل.</p>
        <button className="admin-button" onClick={reset}>
          إعادة المحاولة
        </button>
      </section>
    </main>
  );
}
