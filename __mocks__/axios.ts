const axios = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  request: vi.fn(),
  isAxiosError: vi.fn(),
  create: vi.fn(() => axios),
};

export default axios;
