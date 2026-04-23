"use client";

export default function LinePage() {
  // QRコード画像URL（LINE Developersから取得したもの）
  const qrCodeUrl = "https://qr-official.line.me/gs/M_946ihror_GW.png";

  // 友達追加リンク
  const addFriendUrl = "https://lin.ee/oZ2IsCd";

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">LINE友達追加</h1>

      <img src={qrCodeUrl} alt="LINE友達追加QRコード" />

      <a href={addFriendUrl} target="_blank">
        友達追加する
      </a>

      <p>QRコードを読み取るか、リンクをタップして友達追加してください</p>
    </div>
  );
}
