import { getContentWindowHandle } from '../src/app/hwnd-handler';

jest.mock('../src/common/env', () => {
  return {
    isWindowsOS: true,
    isLinux: false,
    isMac: false,
  };
});

const mockFindWindowExA = jest.fn();
const mockGetWindowRect = jest.fn();

jest.mock('ffi-napi', () => {
  return {
    Library: jest.fn(() => {
      return {
        FindWindowExA: mockFindWindowExA,
        GetWindowRect: mockGetWindowRect,
      };
    }),
  };
});

function writeRect(
  buffer: Buffer,
  left: number,
  top: number,
  right: number,
  bottom: number,
) {
  buffer.writeInt32LE(left, 0);
  buffer.writeInt32LE(top, 4);
  buffer.writeInt32LE(right, 8);
  buffer.writeInt32LE(bottom, 12);
}

describe('hwnd handler', () => {
  beforeEach(() => {
    jest.clearAllMocks().resetModules();

    mockGetWindowRect.mockImplementation((_hwnd: bigint, _rect: Buffer) => {
      return 0;
    });
    mockFindWindowExA.mockImplementation(() => {
      return 0;
    });
  });

  it('not using windows', () => {
    jest.mock('../src/common/env', () => {
      return {
        isWindowsOS: false,
        isLinux: true,
        isMac: false,
      };
    });
    const { getContentWindowHandle } = require('../src/app/hwnd-handler');
    const parent = Buffer.from('hwnd', 'utf8');
    const hwnd = getContentWindowHandle(parent);
    expect(hwnd).toBe(parent);
  });

  it('unexpected buffer size', () => {
    const parent = Buffer.from('hwnd', 'utf8');
    const hwnd = getContentWindowHandle(parent);
    expect(hwnd).toBe(parent);
  });

  it('no child window found', () => {
    const parent = Buffer.from('validhwnd', 'utf8');
    const hwnd = getContentWindowHandle(parent);

    expect(mockGetWindowRect).toBeCalledTimes(0);
    expect(mockFindWindowExA).toBeCalledTimes(1);
    expect(hwnd).toBe(parent);
  });

  it('no rect found for child window', () => {
    mockFindWindowExA.mockImplementationOnce(() => {
      return 4711;
    });

    const parent = Buffer.from('validhwnd', 'utf8');
    const hwnd = getContentWindowHandle(parent);

    expect(mockGetWindowRect).toBeCalledTimes(1);
    expect(mockFindWindowExA).toBeCalledTimes(2);
    expect(hwnd).toBe(parent);
  });

  it('no rect found for second child window', () => {
    mockGetWindowRect.mockImplementationOnce((_hwnd, rect) => {
      writeRect(rect, 10, 10, 100, 10);
      return 1;
    });
    mockFindWindowExA.mockImplementationOnce(() => {
      return 4711;
    });
    mockFindWindowExA.mockImplementationOnce(() => {
      return 42;
    });

    const parent = Buffer.from('validhwnd', 'utf8');
    const hwnd = getContentWindowHandle(parent);

    expect(mockGetWindowRect).toBeCalledTimes(2);
    expect(mockFindWindowExA).toBeCalledTimes(3);
    expect(hwnd).toBe(parent);
  });

  it('matching child window found', () => {
    mockGetWindowRect.mockImplementationOnce((_hwnd, rect) => {
      writeRect(rect, 10, 20, 100, 100);
      return 1;
    });
    mockGetWindowRect.mockImplementationOnce((_hwnd, rect) => {
      writeRect(rect, 10, 10, 100, 10);
      return 1;
    });
    mockFindWindowExA.mockImplementationOnce(() => {
      return 4711;
    });
    mockFindWindowExA.mockImplementationOnce(() => {
      return 42;
    });

    const parent = Buffer.from('validhwnd', 'utf8');
    const hwnd = getContentWindowHandle(parent);

    expect(mockGetWindowRect).toBeCalledTimes(2);
    expect(mockFindWindowExA).toBeCalledTimes(3);
    expect(hwnd.readInt32LE(0)).toBe(4711);
  });

  it('matching child window found second', () => {
    mockGetWindowRect.mockImplementationOnce((_hwnd, rect) => {
      writeRect(rect, 10, 10, 100, 10);
      return 1;
    });
    mockGetWindowRect.mockImplementationOnce((_hwnd, rect) => {
      writeRect(rect, 10, 20, 100, 100);
      return 1;
    });
    mockFindWindowExA.mockImplementationOnce(() => {
      return 4711;
    });
    mockFindWindowExA.mockImplementationOnce(() => {
      return 42;
    });

    const parent = Buffer.from('validhwnd', 'utf8');
    const hwnd = getContentWindowHandle(parent);

    expect(mockGetWindowRect).toBeCalledTimes(2);
    expect(mockFindWindowExA).toBeCalledTimes(3);
    expect(hwnd.readInt32LE(0)).toBe(42);
  });

  it('no matching child window found', () => {
    mockGetWindowRect.mockImplementationOnce((_hwnd, rect) => {
      writeRect(rect, 10, 10, 100, 100);
      return 1;
    });
    mockFindWindowExA.mockImplementationOnce(() => {
      return 4711;
    });

    const parent = Buffer.from('validhwnd', 'utf8');
    const hwnd = getContentWindowHandle(parent);

    expect(mockGetWindowRect).toBeCalledTimes(1);
    expect(mockFindWindowExA).toBeCalledTimes(2);
    expect(hwnd).toBe(parent);
  });
});
