"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          padding: "64px 24px",
          background: "#fbfaf7",
          color: "#182c45",
          fontFamily: "sans-serif",
          textAlign: "center",
        }}
      >
        <h1>تعذّر تحميل الموقع مؤقتًا</h1>
        <p lang="en" dir="ltr">
          The site is temporarily unavailable. Please try again shortly.
        </p>
        <button
          onClick={reset}
          style={{
            background: "#245bc4",
            color: "white",
            padding: "14px 24px",
            border: 0,
            borderRadius: 9,
            cursor: "pointer",
          }}
        >
          إعادة المحاولة / Try again
        </button>
      </body>
    </html>
  );
}
