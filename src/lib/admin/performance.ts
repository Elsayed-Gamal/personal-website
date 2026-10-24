// Server-side diagnostics only. Never log URLs, headers, payloads or identities.
export async function measureAdminOperation<T>(
  stage: "proxy.auth" | "server.auth" | "database.response-headers",
  operation: () => PromiseLike<T>,
): Promise<T> {
  if (process.env.ADMIN_PERFORMANCE_LOG !== "true") return operation();
  const started = performance.now();
  try {
    return await operation();
  } finally {
    console.info(
      "[admin-performance]",
      JSON.stringify({
        stage,
        ms: Math.round((performance.now() - started) * 10) / 10,
      }),
    );
  }
}
