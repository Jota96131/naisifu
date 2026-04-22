import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ShiftEditPage from "@/app/shifts/[id]/edit/page";
import { supabase } from "@/lib/supabase";

// ① Supabaseをまるごと偽物に差し替え
jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

// ② useRouter + useParamsを偽物に差し替え
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: "shift-1" }),
}));

// ③ 型キャスト
const mockGetUser = supabase.auth.getUser as jest.Mock;
const mockFrom = supabase.from as jest.Mock;

describe("シフト編集ページ", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // === チェーンモックを作るヘルパー関数 ===

  const mockStaffChain = () => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { store_id: "store-1" },
        }),
      }),
    }),
  });

  const mockGirlsSelectChain = (girls: { id: string; name: string }[]) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: girls,
          error: null,
        }),
      }),
    }),
  });

  const mockShiftsSingleChain = (shift: {
    id: string;
    girl_id: string;
    scheduled_date: string;
    scheduled_time: string;
  }) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: shift,
        }),
      }),
    }),
  });

  const mockShiftsUpdateChain = () => ({
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    }),
  });

  const mockShiftsDeleteChain = () => ({
    delete: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    }),
  });

  const mockAttendanceDeleteChain = () => ({
    delete: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    }),
  });

  // 初期表示用の共通セットアップ
  const setupInitialMocks = () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "test@example.com" } },
    });

    mockFrom
      .mockReturnValueOnce(mockStaffChain())
      .mockReturnValueOnce(
        mockGirlsSelectChain([
          { id: "girl-1", name: "さくら" },
          { id: "girl-2", name: "ひなた" },
        ]),
      )
      .mockReturnValueOnce(
        mockShiftsSingleChain({
          id: "shift-1",
          girl_id: "girl-1",
          scheduled_date: "2026-04-22",
          scheduled_time: "20:00",
        }),
      );
  };

  // テスト① 既存データが取得されてフォームに表示される
  test("既存データが取得されてフォームに表示される", async () => {
    setupInitialMocks();

    render(<ShiftEditPage />);

    await waitFor(() => {
      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("girl-1");

      const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      expect(dateInput.value).toBe("2026-04-22");

      const timeInput = document.querySelector('input[type="time"]') as HTMLInputElement;
      expect(timeInput.value).toBe("20:00");
    });
  });

  // テスト② 更新ボタンを押すとupdateが呼ばれる
  test("更新ボタンを押すとupdateが呼ばれる", async () => {
    setupInitialMocks();

    render(<ShiftEditPage />);

    await waitFor(() => {
      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("girl-1");
    });

    mockFrom.mockReturnValueOnce(mockShiftsUpdateChain());

    fireEvent.click(screen.getByText("更新"));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("shifts");
      expect(mockPush).toHaveBeenCalledWith("/shifts");
    });
  });

  // テスト③ バリデーション：未入力で更新してもupdateが呼ばれない
  test("未入力で更新してもupdateが呼ばれない", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "test@example.com" } },
    });

    mockFrom
      .mockReturnValueOnce(mockStaffChain())
      .mockReturnValueOnce(
        mockGirlsSelectChain([
          { id: "girl-1", name: "さくら" },
          { id: "girl-2", name: "ひなた" },
        ]),
      )
      .mockReturnValueOnce(
        mockShiftsSingleChain({
          id: "shift-1",
          girl_id: "",
          scheduled_date: "",
          scheduled_time: "",
        }),
      );

    render(<ShiftEditPage />);

    await waitFor(() => {
      expect(screen.getByText("さくら")).toBeInTheDocument();
    });

    mockFrom.mockClear();

    fireEvent.click(screen.getByText("更新"));

    expect(mockFrom).not.toHaveBeenCalled();
  });

  // テスト④ 削除ボタン→確認OK→deleteが呼ばれる
  test("削除ボタン→確認OKでdeleteが呼ばれる", async () => {
    setupInitialMocks();

    render(<ShiftEditPage />);

    await waitFor(() => {
      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("girl-1");
    });

    jest.spyOn(window, "confirm").mockReturnValue(true);

    mockFrom
      .mockReturnValueOnce(mockAttendanceDeleteChain())
      .mockReturnValueOnce(mockShiftsDeleteChain());

    fireEvent.click(screen.getByText("削除"));

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("attendance");
      expect(mockFrom).toHaveBeenCalledWith("shifts");
      expect(mockPush).toHaveBeenCalledWith("/shifts");
    });
  });

  // テスト⑤ 削除ボタン→確認キャンセル→deleteが呼ばれない
  test("削除ボタン→確認キャンセルでdeleteが呼ばれない", async () => {
    setupInitialMocks();

    render(<ShiftEditPage />);

    await waitFor(() => {
      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("girl-1");
    });

    jest.spyOn(window, "confirm").mockReturnValue(false);

    mockFrom.mockClear();

    fireEvent.click(screen.getByText("削除"));

    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalledWith("/shifts");
  });

  // テスト⑥ 削除時にattendanceが先に削除されてからshiftsが削除される
  test("削除時にattendanceが先に削除されてからshiftsが削除される", async () => {
    setupInitialMocks();

    render(<ShiftEditPage />);

    await waitFor(() => {
      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("girl-1");
    });

    jest.spyOn(window, "confirm").mockReturnValue(true);

    const callOrder: string[] = [];
    mockFrom.mockImplementation((table: string) => {
      callOrder.push(table);
      if (table === "attendance") {
        return {
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === "shifts") {
        return {
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {};
    });

    fireEvent.click(screen.getByText("削除"));

    await waitFor(() => {
      expect(callOrder).toEqual(["attendance", "shifts"]);
      expect(mockPush).toHaveBeenCalledWith("/shifts");
    });
  });
});
