import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { buildReminderMessage } from "@/lib/build-reminder-message";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorized(authHeader: string | null, secret: string): boolean {
  if (!authHeader) return false;
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[remind] CRON_SECRET is not configured");
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  if (!isAuthorized(request.headers.get("authorization"), cronSecret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    return Response.json(
      { error: "LINE_CHANNEL_ACCESS_TOKEN is not configured" },
      { status: 500 },
    );
  }

  const today = new Date().toLocaleDateString("sv-SE", {
    timeZone: "Asia/Tokyo",
  });

  const { data: shifts, error } = await supabaseAdmin
    .from("shifts")
    .select("id, scheduled_time, girls(id, name, line_user_id)")
    .eq("scheduled_date", today);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!shifts || shifts.length === 0) {
    return Response.json(
      { message: "本日の出勤予定はありません", date: today },
      { status: 200 },
    );
  }

  const results: Array<{
    girlId?: string | number;
    name?: string;
    status: string;
    detail?: string;
  }> = [];

  for (const shift of shifts) {
    const girl = Array.isArray(shift.girls) ? shift.girls[0] : shift.girls;
    if (!girl) {
      results.push({ status: "skipped（girls未取得）" });
      continue;
    }
    if (!girl.line_user_id) {
      results.push({
        girlId: girl.id,
        status: "skipped（line_user_id未登録）",
      });
      continue;
    }

    const time = String(shift.scheduled_time).slice(0, 5);
    const message = buildReminderMessage(girl.name, time);

    try {
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

      if (res.ok) {
        results.push({ girlId: girl.id, name: girl.name, status: "sent" });
      } else {
        const detail = await res.text().catch(() => "");
        results.push({
          girlId: girl.id,
          name: girl.name,
          status: `failed(${res.status})`,
          detail,
        });
      }
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      results.push({
        girlId: girl.id,
        name: girl.name,
        status: "failed(network)",
        detail,
      });
    }
  }

  const hasFailure = results.some((r) => r.status.startsWith("failed"));
  if (hasFailure) {
    console.error("[remind] some sends failed", { date: today, results });
  }

  return Response.json(
    { date: today, total: shifts.length, results },
    { status: 200 },
  );
}
