// LIFFのIDトークンをLINEのverify APIで検証し、userIdを返す
// クライアントから渡されたuserIdを信用しないために使う

type VerifyResult =
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string };

export async function verifyLiffToken(
  idToken: string | null | undefined,
): Promise<VerifyResult> {
  if (!idToken) {
    return { ok: false, status: 400, error: "IDトークンが必要です" };
  }
  const channelId = process.env.NEXT_PUBLIC_LIFF_CHANNEL_ID;
  if (!channelId) {
    console.error("NEXT_PUBLIC_LIFF_CHANNEL_ID が設定されていません");
    return { ok: false, status: 500, error: "サーバー設定エラー" };
  }

  const params = new URLSearchParams({
    id_token: idToken,
    client_id: channelId,
  });

  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    return { ok: false, status: 401, error: "IDトークンの検証に失敗しました" };
  }

  const data = (await res.json()) as { sub?: string };
  if (!data.sub) {
    return {
      ok: false,
      status: 401,
      error: "IDトークンに userId が含まれていません",
    };
  }
  return { ok: true, userId: data.sub };
}
