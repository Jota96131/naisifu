// LINE Webhookの受け口
// LINEプラットフォームから、友達追加・メッセージなどのイベントがPOSTで届く
import { parseAttendance } from "@/lib/parse-attendance";
import { supabaseAdmin } from "@/lib/supabase-admin";

type LineEvent = {
  type: string;
  source: { userId: string };
  message?: { type: string; text: string };
};

export async function POST(request: Request) {
  const text = await request.text();
  const body = text ? JSON.parse(text) : { events: [] };
  console.log("LINE Webhook受信:", JSON.stringify(body, null, 2));

  for (const event of body.events as LineEvent[]) {
    // 友だち追加イベント
    if (event.type === "follow") {
      console.log("友だち追加されたユーザーID:", event.source.userId);
      continue;
    }

    // メッセージイベント（テキストのみ）
    if (event.type === "message" && event.message?.type === "text") {
      const text = event.message.text;
      const lineUserId = event.source.userId;
      console.log("メッセージ受信:", { text, lineUserId });

      // サブタスク2: メッセージ判定
      const status = parseAttendance(text);
      if (status === null) {
        console.log("出勤/欠勤以外のメッセージなのでスキップ");
        continue;
      }

      // サブタスク3: attendance.status を更新
      // 1. lineUserId から girls を特定
      const { data: girl, error: girlError } = await supabaseAdmin
        .from("girls")
        .select("id, name")
        .eq("line_user_id", lineUserId)
        .single();

      if (girlError || !girl) {
        console.log("該当する女の子が見つかりません:", lineUserId);
        continue;
      }

      // 2. 今日のシフトを取得
      const today = new Date().toLocaleDateString("sv-SE", {
        timeZone: "Asia/Tokyo",
      });
      const { data: shift, error: shiftError } = await supabaseAdmin
        .from("shifts")
        .select("id")
        .eq("girl_id", girl.id)
        .eq("scheduled_date", today)
        .single();

      if (shiftError || !shift) {
        console.log("今日のシフトが見つかりません:", girl.name);
        continue;
      }

      // 3. attendance のステータスを更新
      const { error: updateError } = await supabaseAdmin
        .from("attendance")
        .update({ status })
        .eq("shift_id", shift.id);

      if (updateError) {
        console.log("ステータス更新失敗:", updateError.message);
        continue;
      }

      console.log(`✅ ${girl.name}のステータスを「${text}」に更新しました`);
    }
  }

  return new Response("OK", { status: 200 });
}
