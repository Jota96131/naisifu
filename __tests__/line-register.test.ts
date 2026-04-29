/**
 * @jest-environment node
 */

import { POST } from "@/app/api/line/register/route";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ① supabaseAdminをまるごと偽物に差し替え
jest.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

// ② 型キャスト
const mockFrom = supabaseAdmin.from as jest.Mock;

describe("LINE Register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ここにテスト書いていく
  // girlsテーブル(更新)用: .update().eq().select()
  const mockGirlsUpdateChain = (
    data: { id: string; line_user_id: string }[] | null,
  ) => ({
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data,
          error: null,
        }),
      }),
    }),
  });
  // ============================
  // テスト① 正常登録：userId と girlId を渡すと line_user_id が更新される
  // ============================
  test("userId と girlId を渡すと girls.line_user_id が更新される", async () => {
    // モックをセット：更新後のデータが返る
    mockFrom.mockReturnValueOnce(
      mockGirlsUpdateChain([{ id: "abc-1", line_user_id: "U123" }]),
    );

    const request = new Request("http://localhost/api/line/register", {
      method: "POST",
      body: JSON.stringify({
        userId: "U123",
        girlId: "abc-1",
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    // 検証：200で返ってきた
    expect(response.status).toBe(200);
    // 検証：success: true が返る
    expect(json.success).toBe(true);
    // 検証：girls テーブルが呼ばれた
    expect(mockFrom).toHaveBeenCalledWith("girls");
  });
  // ============================
  // テスト② userId が無いと 400 エラー
  // ============================
  test("userId が無いと 400 エラーが返る", async () => {
    const request = new Request("http://localhost/api/line/register", {
      method: "POST",
      body: JSON.stringify({
        girlId: "abc-1",
        // userId 無し
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    // 検証：400で返ってきた
    expect(response.status).toBe(400);
    // 検証：エラーメッセージが返る
    expect(json.error).toBe("userId と girlId が必要です");
    // 検証：Supabaseは呼ばれていない
    expect(mockFrom).not.toHaveBeenCalled();
  });
  // ============================
  // テスト③ girlId が無いと 400 エラー
  // ============================
  test("girlId が無いと 400 エラーが返る", async () => {
    const request = new Request("http://localhost/api/line/register", {
      method: "POST",
      body: JSON.stringify({
        userId: "U123",
        // girlId 無し
      }),
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("userId と girlId が必要です");
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
