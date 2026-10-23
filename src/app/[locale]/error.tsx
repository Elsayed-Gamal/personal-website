"use client";

export default function ContentError({ reset }: { reset: () => void }) {
  return (
    <section className="container-shell py-24 text-center" role="alert">
      <h1 className="text-2xl font-semibold">
        تعذّر تحميل المحتوى · Content unavailable
      </h1>
      <p className="mt-4">
        حاول مرة أخرى بعد قليل. / Please try again shortly.
      </p>
      <button className="primary-button mt-6" onClick={reset}>
        إعادة المحاولة / Try again
      </button>
    </section>
  );
}
