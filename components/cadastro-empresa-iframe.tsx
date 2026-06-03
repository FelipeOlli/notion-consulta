"use client";

import { useEffect, useState } from "react";

const BASE_URL = "https://dashboard-tarefa-six.vercel.app";

export function CadastroEmpresaIframe() {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/cadastro-empresa/token")
      .then((r) => r.json())
      .then(({ access_token, refresh_token, expires_in }) => {
        if (!access_token) { setSrc(BASE_URL); return; }
        setSrc(
          `${BASE_URL}/#access_token=${access_token}&token_type=bearer&expires_in=${expires_in}&refresh_token=${refresh_token}&type=magiclink`
        );
      })
      .catch(() => setSrc(BASE_URL));
  }, []);

  if (!src) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <p className="text-sm" style={{ color: "var(--onity-dark-text-muted)" }}>Conectando...</p>
      </div>
    );
  }

  return (
    <iframe
      src={src}
      className="h-full w-full"
      style={{ border: "none" }}
      title="Cadastro de empresa"
      allow="clipboard-write"
    />
  );
}
