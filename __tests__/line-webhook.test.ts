/**
 * @jest-environment node
 */

import { POST } from "@/app/api/line/webhook/route";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ① supabaseAdminをまるごと偽物に差し替え
jest.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

// ② 型キャスト
const mockFrom = supabaseAdmin.from as jest.Mock;

describe("LINE Webhook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ここにテストを書いていく（次のステップで）
  // girlsテーブル用: .select().eq().single()
  const mockGirlsChain = (girl: { id: string; name: string } | null) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: girl,
          error: girl ? null : { message: "not found" },
        }),
      }),
    }),
  });

  // shiftsテーブル用: .select().eq().eq().single()
  const mockShiftsChain = (shift: { id: string } | null) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: shift,
            error: shift ? null : { message: "not found" },
          }),
        }),
      }),
    }),
  });

  // attendanceテーブル(更新)用: .update().eq()
  const mockAttendanceUpdateChain = () => ({
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    }),
  });

  // ============================
  // テスト① 「出勤」メッセージで attendance.status が更新される
  // ============================
  test("「出勤」メッセージで attendance.status が更新される", async () => {
    // モックを順番にセット（girls → shifts → attendance）
    mockFrom
      .mockReturnValueOnce(mockGirlsChain({ id: "1", name: "きい" }))
      .mockReturnValueOnce(mockShiftsChain({ id: "9" }))
      .mockReturnValueOnce(mockAttendanceUpdateChain());

    // LINEから来るリクエストを偽装
    const request = new Request("http://localhost/api/line/webhook", {
      method: "POST",
      body: JSON.stringify({
        events: [
          {
            type: "message",
            source: { userId: "U123" },
            message: { type: "text", text: "出勤" },
          },
        ],
      }),
    });

    // POST関数を実行
    const response = await POST(request);

    // 検証：200で返ってきた
    expect(response.status).toBe(200);
    // 検証：attendanceテーブルが呼ばれた
    expect(mockFrom).toHaveBeenCalledWith("attendance");
  });
});
