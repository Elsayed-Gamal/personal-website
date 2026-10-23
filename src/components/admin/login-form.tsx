"use client";
import { useActionState } from "react";
import { login } from "@/app/admin/actions";
export function LoginForm() {
  const [state, action, pending] = useActionState(login, { error: "" });
  return (
    <form action={action} className="admin-form">
      <label htmlFor="email">البريد الإلكتروني</label>
      <input
        id="email"
        name="email"
        type="email"
        dir="ltr"
        autoComplete="username"
        required
        maxLength={254}
      />
      <label htmlFor="password">كلمة المرور</label>
      <input
        id="password"
        name="password"
        type="password"
        dir="ltr"
        autoComplete="current-password"
        required
        maxLength={256}
      />
      {state.error && (
        <p role="alert" className="admin-error">
          {state.error}
        </p>
      )}
      <button className="admin-button" disabled={pending}>
        {pending ? "جارٍ تسجيل الدخول…" : "تسجيل الدخول"}
      </button>
    </form>
  );
}
