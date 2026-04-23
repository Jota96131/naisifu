import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const body = await request.json();
  const { userId, girlId } = body;

  if (!userId || !girlId) {
    return new Response(
      JSON.stringify({ error: "userId と girlId が必要です" }),
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("girls")
    .update({ line_user_id: userId })
    .eq("id", girlId)
    .select();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!data || data.length === 0) {
    return new Response(
      JSON.stringify({ error: "更新された行がありません（RLSかidが間違い）", data }),
      { status: 404 }
    );
  }

  return new Response(JSON.stringify({ success: true, data }), { status: 200 });
}
