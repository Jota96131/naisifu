import { supabaseAdmin } from "@/lib/supabase-admin";
import { verifyLiffToken } from "@/lib/verify-liff-token";

const getBearerToken = (request: Request): string | null => {
  const auth = request.headers.get("authorization");
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
};

// 店舗コードから「未連携の女の子一覧」を取得
// LIFFのIDトークンによる認証必須
export async function GET(request: Request) {
  const verified = await verifyLiffToken(getBearerToken(request));
  if (!verified.ok) {
    return new Response(JSON.stringify({ error: verified.error }), {
      status: verified.status,
    });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return new Response(JSON.stringify({ error: "code が必要です" }), {
      status: 400,
    });
  }

  const { data: store, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id, name")
    .eq("store_code", code)
    .single();

  if (storeError || !store) {
    return new Response(JSON.stringify({ error: "店舗が見つかりません" }), {
      status: 404,
    });
  }

  const { data: girls, error: girlsError } = await supabaseAdmin
    .from("girls")
    .select("id, name")
    .eq("store_id", store.id)
    .is("line_user_id", null)
    .order("created_at", { ascending: false });

  if (girlsError) {
    return new Response(JSON.stringify({ error: girlsError.message }), {
      status: 500,
    });
  }

  return new Response(
    JSON.stringify({
      store: { id: store.id, name: store.name },
      girls: girls ?? [],
    }),
    { status: 200 },
  );
}

// 選択された女の子と LINE userId を紐付ける
// userIdはクライアント指定ではなく、IDトークン検証結果のものを使う
export async function POST(request: Request) {
  const verified = await verifyLiffToken(getBearerToken(request));
  if (!verified.ok) {
    return new Response(JSON.stringify({ error: verified.error }), {
      status: verified.status,
    });
  }
  const userId = verified.userId;

  const body = await request.json();
  const { code, girlId } = body;

  if (!code || !girlId) {
    return new Response(
      JSON.stringify({ error: "code, girlId が必要です" }),
      { status: 400 },
    );
  }

  const { data: store, error: storeError } = await supabaseAdmin
    .from("stores")
    .select("id")
    .eq("store_code", code)
    .single();

  if (storeError || !store) {
    return new Response(JSON.stringify({ error: "店舗が見つかりません" }), {
      status: 404,
    });
  }

  const { data: girl, error: girlError } = await supabaseAdmin
    .from("girls")
    .select("id, store_id")
    .eq("id", girlId)
    .single();

  if (girlError || !girl) {
    return new Response(JSON.stringify({ error: "女の子が見つかりません" }), {
      status: 404,
    });
  }

  if (girl.store_id !== store.id) {
    return new Response(
      JSON.stringify({ error: "店舗と女の子の組み合わせが不正です" }),
      { status: 400 },
    );
  }

  // race condition 対策：line_user_id が NULL の行だけ更新
  const { data: updated, error: updateError } = await supabaseAdmin
    .from("girls")
    .update({ line_user_id: userId })
    .eq("id", girlId)
    .is("line_user_id", null)
    .select();

  if (updateError) {
    // 23505 = PostgresのUNIQUE違反。同じLINEが既に別のgirlに紐付いている。
    if (updateError.code === "23505") {
      return new Response(
        JSON.stringify({
          error:
            "このLINEアカウントは既に別の女の子で登録されています。お店に確認してください。",
        }),
        { status: 409 },
      );
    }
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 500,
    });
  }

  if (!updated || updated.length === 0) {
    return new Response(
      JSON.stringify({ error: "この女の子は既に連携されています" }),
      { status: 409 },
    );
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
