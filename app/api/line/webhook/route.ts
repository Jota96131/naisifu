// LINE Webhookの受け口
// LINEプラットフォームから、友達追加などのイベントがPOSTで届く

export async function POST(request: Request) {
  // リクエストのbodyを取得（空のときもあるので安全に処理）
  const text = await request.text();
  const body = text ? JSON.parse(text) : { events: [] };
  console.log("LINE Webhook受信:", JSON.stringify(body, null, 2));

  // eventsをループして、followイベントだけ処理する
  body.events.forEach((event: { type: string; source: { userId: string } }) => {
    if (event.type === "follow") {
      console.log("友だち追加されたユーザーID:", event.source.userId);
    }
  });

  return new Response("OK", { status: 200 });
}
