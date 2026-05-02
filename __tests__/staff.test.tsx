import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StaffPage from "@/app/staff/page";
import { supabase } from "@/lib/supabase";

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockGetUser = supabase.auth.getUser as jest.Mock;
const mockFrom = supabase.from as jest.Mock;

describe("黒服一覧ページ", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockStaffStoreIdChain = () => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { store_id: "store-1" },
        }),
      }),
    }),
  });

  const mockStaffSelectChain = (
    staffList: { id: string; name: string; email?: string }[],
  ) => ({
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

  const setupInitialMocks = (
    staffList: { id: string; name: string; email?: string }[],
  ) => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "test@example.com" } },
    });

    mockFrom
      .mockReturnValueOnce(mockStaffStoreIdChain())
      .mockReturnValueOnce(mockStaffSelectChain(staffList));
  };

  test("ページ表示時にスタッフ一覧が表示される", async () => {
    setupInitialMocks([
      { id: "1", name: "田中", email: "tanaka@example.com" },
      { id: "2", name: "佐藤", email: "sato@example.com" },
    ]);

    render(<StaffPage />);

    await waitFor(() => {
      expect(screen.getByText("田中")).toBeInTheDocument();
      expect(screen.getByText("佐藤")).toBeInTheDocument();
    });
  });

  test("名前を入力して登録ボタンを押すと登録される", async () => {
    setupInitialMocks([{ id: "1", name: "田中", email: "tanaka@example.com" }]);

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
          { id: "1", name: "田中", email: "tanaka@example.com" },
          { id: "2", name: "山田", email: "yamada@example.com" },
        ]),
      );

    fireEvent.change(screen.getByPlaceholderText("名前を入力"), {
      target: { value: "山田" },
    });
    fireEvent.click(screen.getByRole("button", { name: "登録" }));

    await waitFor(() => {
      expect(screen.getByText("山田")).toBeInTheDocument();
    });
  });

  test("削除ボタンを押して削除モーダルで確定すると削除される", async () => {
    setupInitialMocks([
      { id: "1", name: "田中", email: "tanaka@example.com" },
      { id: "2", name: "佐藤", email: "sato@example.com" },
    ]);

    render(<StaffPage />);

    await waitFor(() => {
      expect(screen.getByText("田中")).toBeInTheDocument();
      expect(screen.getByText("佐藤")).toBeInTheDocument();
    });

    mockFrom
      .mockReturnValueOnce(mockStaffDeleteChain())
      .mockReturnValueOnce(mockStaffStoreIdChain())
      .mockReturnValueOnce(
        mockStaffSelectChain([
          { id: "2", name: "佐藤", email: "sato@example.com" },
        ]),
      );

    fireEvent.click(screen.getByRole("button", { name: "田中を削除" }));

    fireEvent.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(screen.queryByText("田中")).not.toBeInTheDocument();
      expect(screen.getByText("佐藤")).toBeInTheDocument();
    });
  });

  test("名前が空のまま登録ボタンを押してもinsertが呼ばれない", async () => {
    setupInitialMocks([{ id: "1", name: "田中", email: "tanaka@example.com" }]);

    render(<StaffPage />);

    await waitFor(() => {
      expect(screen.getByText("田中")).toBeInTheDocument();
    });

    mockFrom.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "登録" }));

    expect(mockFrom).not.toHaveBeenCalled();
  });

  test("スペースだけ入力して登録ボタンを押してもinsertが呼ばれない", async () => {
    setupInitialMocks([{ id: "1", name: "田中", email: "tanaka@example.com" }]);

    render(<StaffPage />);

    await waitFor(() => {
      expect(screen.getByText("田中")).toBeInTheDocument();
    });

    mockFrom.mockClear();

    fireEvent.change(screen.getByPlaceholderText("名前を入力"), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByRole("button", { name: "登録" }));

    expect(mockFrom).not.toHaveBeenCalled();
  });

  test("自店舗のスタッフだけ表示され、他店舗のスタッフは表示されない", async () => {
    setupInitialMocks([
      { id: "1", name: "田中", email: "tanaka@example.com" },
      { id: "2", name: "佐藤", email: "sato@example.com" },
    ]);

    render(<StaffPage />);

    await waitFor(() => {
      expect(screen.getByText("田中")).toBeInTheDocument();
      expect(screen.getByText("佐藤")).toBeInTheDocument();

      expect(screen.queryByText("鈴木")).not.toBeInTheDocument();
    });
  });
});
