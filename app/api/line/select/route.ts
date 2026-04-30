import { supabaseAdmin } from "@/lib/supabase-admin";

// 店舗コードから「未連携の女の子一覧」を取得
export async function GET(request: Request) {
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
export async function POST(request: Request) {
  const body = await request.json();
  const { code, girlId, userId } = body;

  if (!code || !girlId || !userId) {
    return new Response(
      JSON.stringify({ error: "code, girlId, userId が必要です" }),
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
    .select("id, store_id, line_user_id")
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

  if (girl.line_user_id) {
    return new Response(
      JSON.stringify({ error: "この女の子は既に連携されています" }),
      { status: 409 },
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("girls")
    .update({ line_user_id: userId })
    .eq("id", girlId);

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 500,
    });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
