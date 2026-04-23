import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    return new Response(
      JSON.stringify({ error: "LINE_CHANNEL_ACCESS_TOKEN is not configured" }),
      { status: 500 }
    );
  }

  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });

  const { data: shifts, error } = await supabaseAdmin
    .from("shifts")
    .select("id, scheduled_time, girls(id, name, line_user_id)")
    .eq("scheduled_date", today);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!shifts || shifts.length === 0) {
    return new Response(
      JSON.stringify({ message: "本日の出勤予定はありません", date: today }),
      { status: 200 }
    );
  }

  const results = [];

  for (const shift of shifts) {
    const girl = Array.isArray(shift.girls) ? shift.girls[0] : shift.girls;
    if (!girl) {
      results.push({ girlId: undefined, status: "skipped（girls未取得）" });
      continue;
    }
    if (!girl.line_user_id) {
      results.push({ girlId: girl.id, status: "skipped（line_user_id未登録）" });
      continue;
    }

    const message = `${girl.name}さん、本日${shift.scheduled_time}から出勤予定です。\n出勤する場合は「出勤」、欠勤の場合は「欠勤」と返信してください。`;

    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: girl.line_user_id,
        messages: [{ type: "text", text: message }],
      }),
    });

    results.push({
      girlId: girl.id,
      name: girl.name,
      status: res.ok ? "sent" : `failed(${res.status})`,
    });
  }

  return new Response(
    JSON.stringify({ date: today, total: shifts.length, results }),
    { status: 200 }
  );
}
