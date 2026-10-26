"use client";
import { useEffect, useState } from "react";
import type { PageResult } from "@/lib/admin/pagination";
// Small query objects only; never serialize content bodies. Ignore superseded responses.
export function usePagedData<Q, T>(
  query: Q,
  initial: T,
  load: (query: Q) => Promise<PageResult<T>>,
) {
  const [revision, setRevision] = useState(0);
  const token = JSON.stringify(query) + ":" + revision;
  const [state, setState] = useState({ token, data: initial, error: "" });
  const serialized = JSON.stringify(query);
  useEffect(() => {
    if (state.token === token) return;
    let active = true;
    const timer = setTimeout(() => {
      void load(JSON.parse(serialized))
        .then((result) => {
          if (!active) return;
          setState((old) =>
            result.ok
              ? { token, data: result.page, error: "" }
              : { ...old, token, error: result.message },
          );
        })
        .catch(() => {
          if (active)
            setState((old) => ({
              ...old,
              token,
              error: "تعذر تحميل القائمة. حاول مجددًا.",
            }));
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [token, serialized, load, state.token]);
  return {
    data: state.data,
    loading: state.token !== token,
    error: state.error,
    reload: () => setRevision((n) => n + 1),
  };
}
