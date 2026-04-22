import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ShiftsPage from "@/app/shifts/page";
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

// ② useRouterを偽物に差し替え
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ③ 型キャスト
const mockGetUser = supabase.auth.getUser as jest.Mock;
const mockFrom = supabase.from as jest.Mock;

describe("シフト一覧ページ", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // === チェーンモックを作るヘルパー関数 ===

  // staffテーブル用: .select().eq().single()
  const mockStaffChain = () => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { store_id: "store-1" },
        }),
      }),
    }),
  });

  // shiftsテーブル(取得)用: .select().eq() + 日付フィルタ + .order()
  const mockShiftsSelectChain = (
    shifts: {
      id: string;
      girls: { name: string };
      scheduled_date: string;
      scheduled_time: string;
      attendance: { id: string; status: string }[];
    }[],
  ) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: shifts,
            error: null,
          }),
        }),
        gte: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: shifts,
              error: null,
            }),
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

  // 初期表示用の共通セットアップ
  const setupInitialMocks = (
    shifts: {
      id: string;
      girls: { name: string };
      scheduled_date: string;
      scheduled_time: string;
      attendance: { id: string; status: string }[];
    }[],
  ) => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "test@example.com" } },
    });

    mockFrom
      .mockReturnValueOnce(mockStaffChain())
      .mockReturnValueOnce(mockShiftsSelectChain(shifts));
  };

  // ============================
  // テスト① 一覧表示テスト
  // ============================
  test("ページ表示時にシフト一覧が表示される", async () => {
    setupInitialMocks([
      {
        id: "1",
        girls: { name: "さくら" },
        scheduled_date: "2026-04-21",
        scheduled_time: "20:00",
        attendance: [{ id: "a1", status: "未確認" }],
      },
      {
        id: "2",
        girls: { name: "ひなた" },
        scheduled_date: "2026-04-21",
        scheduled_time: "21:00",
        attendance: [{ id: "a2", status: "出勤" }],
      },
    ]);

    render(<ShiftsPage />);

    await waitFor(() => {
      // 穴埋め: 2人の名前が表示されていることを確認
      expect(screen.getByText("さくら")).toBeInTheDocument();
      expect(screen.getByText("ひなた")).toBeInTheDocument();
    });
  });

  // ============================
  // テスト② 他店舗のシフトが表示されないことを確認（RLS検証）
  // ============================
  test("自店舗のシフトだけ表示され、他店舗のシフトは表示されない", async () => {
    // RLSが効いてる = store-1のシフトだけ返ってくる
    setupInitialMocks([
      {
        id: "1",
        girls: { name: "さくら" },
        scheduled_date: "2026-04-21",
        scheduled_time: "20:00",
        attendance: [{ id: "a1", status: "未確認" }],
      },
    ]);

    render(<ShiftsPage />);

    await waitFor(() => {
      // 穴埋め: 自店舗の子が表示されること
      expect(screen.getByText("さくら")).toBeInTheDocument();

      // 穴埋め: 他店舗の子（"りん"）が表示されないこと
      expect(screen.queryByText("りん")).not.toBeInTheDocument();
    });
  });

  // ============================
  // テスト③ カードをクリックすると編集ページに遷移する
  // ============================
  test("シフトカードをクリックすると編集ページに遷移する", async () => {
    setupInitialMocks([
      {
        id: "shift-1",
        girls: { name: "さくら" },
        scheduled_date: "2026-04-21",
        scheduled_time: "20:00",
        attendance: [{ id: "a1", status: "未確認" }],
      },
    ]);

    render(<ShiftsPage />);

    await waitFor(() => {
      expect(screen.getByText("さくら")).toBeInTheDocument();
    });

    // カードの名前をクリック
    fireEvent.click(screen.getByText("さくら"));

    // 穴埋め: router.pushが正しいURLで呼ばれたことを確認
    expect(mockPush).toHaveBeenCalledWith("/shifts/shift-1/edit");
  });

  // ============================
  // テスト④ シフトがない場合のメッセージ表示
  // ============================
  test("シフトがない場合「シフトはありません」と表示される", async () => {
    // 空配列でセットアップ
    setupInitialMocks([]);

    render(<ShiftsPage />);

    await waitFor(() => {
      // 穴埋め: メッセージが表示されること
      expect(screen.getByText("シフトはありません")).toBeInTheDocument();
    });
  });

  // ============================
  // テスト⑤ ステータス更新：「出勤」ボタンを押すとステータスが変わる
  // ============================
  test("「出勤」ボタンを押すとステータスが更新される", async () => {
    setupInitialMocks([
      {
        id: "1",
        girls: { name: "さくら" },
        scheduled_date: "2026-04-21",
        scheduled_time: "20:00",
        attendance: [{ id: "a1", status: "未確認" }],
      },
    ]);

    render(<ShiftsPage />);

    await waitFor(() => {
      expect(screen.getByText("さくら")).toBeInTheDocument();
    });

    // 「出勤」ボタン押下後のモックをセット
    mockFrom.mockReturnValueOnce(mockAttendanceUpdateChain());

    // 穴埋め: 「出勤」ボタンをクリック
    fireEvent.click(screen.getByText("出勤"));

    // 穴埋め: attendanceテーブルのupdateが呼ばれたことを確認
    expect(mockFrom).toHaveBeenCalledWith("attendance");
  });

  // ============================
  // テスト⑥ ステータス更新：「欠勤」ボタンを押すとステータスが変わる
  // ============================
  test("「欠勤」ボタンを押すとステータスが更新される", async () => {
    setupInitialMocks([
      {
        id: "1",
        girls: { name: "さくら" },
        scheduled_date: "2026-04-21",
        scheduled_time: "20:00",
        attendance: [{ id: "a1", status: "未確認" }],
      },
    ]);

    render(<ShiftsPage />);

    await waitFor(() => {
      expect(screen.getByText("さくら")).toBeInTheDocument();
    });

    mockFrom.mockReturnValueOnce(mockAttendanceUpdateChain());

    // 穴埋め: 「欠勤」ボタンをクリック
    fireEvent.click(screen.getByText("欠勤"));

    // 穴埋め: attendanceテーブルのupdateが呼ばれたことを確認
    expect(mockFrom).toHaveBeenCalledWith("attendance");
  });

  // ============================
  // テスト⑦ 「当日」ボタンが初期状態で選択されている
  // ============================
  test("初期状態で「当日」ボタンが選択されている", async () => {
    setupInitialMocks([]);

    render(<ShiftsPage />);

    // 穴埋め: 「当日」ボタンが青色のクラスを持っていることを確認
    const todayButton = screen.getByText("当日");
    expect(todayButton.className).toContain("bg-blue-600");

    // 穴埋め: 「今週」ボタンがグレーのクラスを持っていることを確認
    const weekButton = screen.getByText("今週");
    expect(weekButton.className).toContain("bg-gray-200");
  });

  // ============================
  // テスト⑧ 「今週」ボタンを押すと切り替わる
  // ============================
  test("「今週」ボタンを押すと選択状態が切り替わる", async () => {
    setupInitialMocks([]);

    render(<ShiftsPage />);

    // 初期表示の完了を待つ
    await waitFor(() => {
      expect(screen.getByText("シフトはありません")).toBeInTheDocument();
    });

    // クリック後のデータ再取得用モック
    mockGetUser.mockResolvedValue({
      data: { user: { email: "test@example.com" } },
    });
    mockFrom
      .mockReturnValueOnce(mockStaffChain())
      .mockReturnValueOnce(mockShiftsSelectChain([]));

    // 穴埋め: 「今週」ボタンをクリック
    fireEvent.click(screen.getByText("今週"));

    await waitFor(() => {
      // 穴埋め: 「今週」ボタンが青色になること
      const weekButton = screen.getByText("今週");
      expect(weekButton.className).toContain("bg-blue-600");

      // 穴埋め: 「当日」ボタンがグレーになること
      const todayButton = screen.getByText("当日");
      expect(todayButton.className).toContain("bg-gray-200");
    });
  });

  // ============================
  // テスト⑨ 一連フロー：一覧表示→ステータス更新→人数表示が変わる
  // ============================
  test("シフト一覧表示後、ステータスを欠勤に変更すると欠勤人数が表示される", async () => {
    setupInitialMocks([
      {
        id: "1",
        girls: { name: "さくら" },
        scheduled_date: "2026-04-22",
        scheduled_time: "20:00",
        attendance: [{ id: "a1", status: "未確認" }],
      },
      {
        id: "2",
        girls: { name: "ひなた" },
        scheduled_date: "2026-04-22",
        scheduled_time: "21:00",
        attendance: [{ id: "a2", status: "未確認" }],
      },
    ]);

    render(<ShiftsPage />);

    // 一覧が表示されることを確認
    await waitFor(() => {
      expect(screen.getByText("さくら")).toBeInTheDocument();
      expect(screen.getByText("ひなた")).toBeInTheDocument();
    });

    // 欠勤人数がまだ0であることを確認
    expect(screen.getByText("欠勤 0名")).toBeInTheDocument();

    // さくらのステータスを「欠勤」に変更
    mockFrom.mockReturnValueOnce(mockAttendanceUpdateChain());

    // 「欠勤」ボタンをクリック（さくらのカードの方）
    const absentButtons = screen.getAllByText("欠勤");
    fireEvent.click(absentButtons[0]);

    // ステータス変更後、欠勤人数が表示されることを確認
    await waitFor(() => {
      expect(screen.getByText("欠勤 1名")).toBeInTheDocument();
    });
  });
});
