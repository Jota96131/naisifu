import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StaffPage from "@/app/staff/page";
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

// ② 型キャスト
const mockGetUser = supabase.auth.getUser as jest.Mock;
const mockFrom = supabase.from as jest.Mock;

describe("黒服一覧ページ", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // === チェーンモックを作るヘルパー関数 ===

  const mockStaffStoreIdChain = () => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { store_id: "store-1" },
        }),
      }),
    }),
  });

  const mockStaffSelectChain = (staffList: { id: string; name: string }[]) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: staffList,
          error: null,
        }),
      }),
    }),
  });

  const mockStaffInsertChain = () => ({
    insert: jest.fn().mockResolvedValue({ error: null }),
  });

  const mockStaffDeleteChain = () => ({
    delete: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    }),
  });

  const setupInitialMocks = (staffList: { id: string; name: string }[]) => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "test@example.com" } },
    });

    mockFrom
      .mockReturnValueOnce(mockStaffStoreIdChain())
      .mockReturnValueOnce(mockStaffSelectChain(staffList));
  };

  // ① 一覧表示テスト
  test("ページ表示時にスタッフ一覧が表示される", async () => {
    setupInitialMocks([
      { id: "1", name: "田中" },
      { id: "2", name: "佐藤" },
    ]);

    render(<StaffPage />);

    await waitFor(() => {
      expect(screen.getByText("田中")).toBeInTheDocument();
      expect(screen.getByText("佐藤")).toBeInTheDocument();
    });
  });

  // ② 登録テスト
  test("名前を入力して登録ボタンを押すと登録される", async () => {
    setupInitialMocks([{ id: "1", name: "田中" }]);

    render(<StaffPage />);

    await waitFor(() => {
      expect(screen.getByText("田中")).toBeInTheDocument();
    });

    mockGetUser.mockResolvedValue({
      data: { user: { email: "test@example.com" } },
    });
    mockFrom
      .mockReturnValueOnce(mockStaffStoreIdChain())
      .mockReturnValueOnce(mockStaffInsertChain())
      .mockReturnValueOnce(mockStaffStoreIdChain())
      .mockReturnValueOnce(
        mockStaffSelectChain([
          { id: "1", name: "田中" },
          { id: "2", name: "山田" },
        ]),
      );

    fireEvent.change(screen.getByPlaceholderText("名前を入力"), {
      target: { value: "山田" },
    });
    fireEvent.click(screen.getByText("登録"));

    await waitFor(() => {
      expect(screen.getByText("山田")).toBeInTheDocument();
    });
  });

  // ③ 削除テスト
  test("削除ボタンを押すと削除される", async () => {
    setupInitialMocks([
      { id: "1", name: "田中" },
      { id: "2", name: "佐藤" },
    ]);

    render(<StaffPage />);

    await waitFor(() => {
      expect(screen.getByText("田中")).toBeInTheDocument();
      expect(screen.getByText("佐藤")).toBeInTheDocument();
    });

    mockGetUser.mockResolvedValue({
      data: { user: { email: "test@example.com" } },
    });
    mockFrom
      .mockReturnValueOnce(mockStaffDeleteChain())
      .mockReturnValueOnce(mockStaffStoreIdChain())
      .mockReturnValueOnce(
        mockStaffSelectChain([
          { id: "2", name: "佐藤" },
        ]),
      );

    const deleteButtons = screen.getAllByText("削除");
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText("田中")).not.toBeInTheDocument();
      expect(screen.getByText("佐藤")).toBeInTheDocument();
    });
  });

  // ④ バリデーション：空文字
  test("名前が空のまま登録ボタンを押してもinsertが呼ばれない", async () => {
    setupInitialMocks([{ id: "1", name: "田中" }]);

    render(<StaffPage />);

    await waitFor(() => {
      expect(screen.getByText("田中")).toBeInTheDocument();
    });

    mockFrom.mockClear();

    fireEvent.click(screen.getByText("登録"));

    expect(mockFrom).not.toHaveBeenCalled();
  });

  // ⑤ バリデーション：スペースのみ
  test("スペースだけ入力して登録ボタンを押してもinsertが呼ばれない", async () => {
    setupInitialMocks([{ id: "1", name: "田中" }]);

    render(<StaffPage />);

    await waitFor(() => {
      expect(screen.getByText("田中")).toBeInTheDocument();
    });

    mockFrom.mockClear();

    fireEvent.change(screen.getByPlaceholderText("名前を入力"), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByText("登録"));

    expect(mockFrom).not.toHaveBeenCalled();
  });

  // ⑥ RLS検証テスト
  test("自店舗のスタッフだけ表示され、他店舗のスタッフは表示されない", async () => {
    setupInitialMocks([
      { id: "1", name: "田中" },
      { id: "2", name: "佐藤" },
    ]);

    render(<StaffPage />);

    await waitFor(() => {
      expect(screen.getByText("田中")).toBeInTheDocument();
      expect(screen.getByText("佐藤")).toBeInTheDocument();

      expect(screen.queryByText("鈴木")).not.toBeInTheDocument();
    });
  });
});
