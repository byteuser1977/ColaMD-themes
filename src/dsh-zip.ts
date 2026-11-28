/**
 * 极简 ZIP 打包器 —— 只做 STORE（不压缩），零依赖、同步、可复现。
 *
 * 供 `.docx` / `.pptx` 这类 OOXML 包使用：包内都是已经压过的小体积 XML，
 * STORE 省掉 `node:zlib` 与流式 API，任何平台都能一次调用拿到完整字节。
 * 文件名统一走 UTF-8（通用标志位 bit 11），路径分隔符统一成 `/`；时间戳
 * 缺省固定为 1980-01-01，保证同一份输入产出同一份字节。
 */

/** 一个待写入 ZIP 的文件条目（只允许文件，不允许目录条目）。 */
export interface ZipEntry {
  /** 包内路径，例如 `word/document.xml`；反斜杠会被改写成 `/`。 */
  path: string;
  data: Uint8Array;
  /** 可选修改时间；缺省为 1980-01-01T00:00:00Z，保证可复现。 */
  date?: Date;
}

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD = 0x06054b50;
const VERSION_NEEDED = 20;
/** 通用标志位 bit 11：文件名为 UTF-8。 */
const FLAG_UTF8 = 0x0800;
/** 1980-01-01 00:00:00 的 DOS 日期/时间。 */
const DOS_DATE_1980 = 0x0021;
const DOS_TIME_MIDNIGHT = 0x0000;
const MIN_1980 = Date.UTC(1980, 0, 1);
const MAX_YEAR = 2107;

/** CRC32 查表（IEEE 802.3 多项式 0xEDB88320），模块加载时构建一次。 */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let bit = 0; bit < 8; bit++) {
      c = (c & 1) === 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

/** 计算 CRC32 校验值。 */
function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** 把条目路径规范成 ZIP 约定形式：正斜杠、无前导 `/` 或 `./`。 */
function cleanPath(raw: string): string {
  let path = raw.replace(/\\/g, "/");
  path = path.replace(/^\/+/, "").replace(/^(?:\.\/)+/, "");
  if (path === "" || path.endsWith("/")) {
    throw new Error(`zipStore: invalid file path "${raw}" (directories are not supported)`);
  }
  return path;
}

/** Date → DOS 时间/日期字对；超出范围时退回 1980-01-01。 */
function toDos(date: Date | undefined): { time: number; date: number } {
  if (date === undefined || Number.isNaN(date.getTime()) || date.getTime() < MIN_1980) {
    return { time: DOS_TIME_MIDNIGHT, date: DOS_DATE_1980 };
  }
  const year = Math.min(date.getUTCFullYear(), MAX_YEAR);
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = Math.floor(date.getUTCSeconds() / 2); // DOS 时间精度 2 秒
  return {
    time: (hours << 11) | (minutes << 5) | seconds,
    date: ((year - 1980) << 9) | (month << 5) | day,
  };
}

/**
 * 把若干文件打成 ZIP（STORE，不压缩）。
 *
 * 固定使用 version-needed 20、UTF-8 名称、外部属性 0；条目顺序与入参一致。
 * 不支持 ZIP64：总字节数或条目数超出经典 ZIP 上限时直接抛错，而不是产出
 * 一个半坏的包。
 */
export function zipStore(entries: readonly ZipEntry[]): Uint8Array {
  if (entries.length > 0xffff) {
    throw new Error(`zipStore: too many entries (${entries.length} > 65535)`);
  }
  const encoder = new TextEncoder();
  const prepared = entries.map((entry) => {
    const name = encoder.encode(cleanPath(entry.path));
    return { name, data: entry.data, crc: crc32(entry.data), dt: toDos(entry.date), offset: 0 };
  });

  let total = 22; // EOCD
  for (const item of prepared) {
    total += 30 + item.name.length + item.data.length; // 本地文件头 + 数据
    total += 46 + item.name.length; // 中央目录项
  }
  if (total > 0xffffffff) {
    throw new Error("zipStore: archive exceeds 4 GiB (ZIP64 is not supported)");
  }

  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  let at = 0;
  const u16 = (value: number): void => {
    view.setUint16(at, value, true);
    at += 2;
  };
  const u32 = (value: number): void => {
    view.setUint32(at, value >>> 0, true);
    at += 4;
  };
  const bytes = (chunk: Uint8Array): void => {
    out.set(chunk, at);
    at += chunk.length;
  };

  // 本地文件头 + 原始数据。
  for (const item of prepared) {
    item.offset = at;
    u32(SIG_LOCAL);
    u16(VERSION_NEEDED);
    u16(FLAG_UTF8);
    u16(0); // 方法 0 = STORE
    u16(item.dt.time);
    u16(item.dt.date);
    u32(item.crc);
    u32(item.data.length);
    u32(item.data.length);
    u16(item.name.length);
    u16(0); // extra 长度
    bytes(item.name);
    bytes(item.data);
  }

  // 中央目录。
  const cdStart = at;
  for (const item of prepared) {
    u32(SIG_CENTRAL);
    u16(VERSION_NEEDED); // version made by
    u16(VERSION_NEEDED); // version needed
    u16(FLAG_UTF8);
    u16(0);
    u16(item.dt.time);
    u16(item.dt.date);
    u32(item.crc);
    u32(item.data.length);
    u32(item.data.length);
    u16(item.name.length);
    u16(0); // extra
    u16(0); // comment
    u16(0); // 起始磁盘号
    u16(0); // 内部属性
    u32(0); // 外部属性
    u32(item.offset);
    bytes(item.name);
  }
  const cdSize = at - cdStart;

  // 中央目录结束记录。
  u32(SIG_EOCD);
  u16(0); // 本磁盘号
  u16(0); // 中央目录起始磁盘号
  u16(prepared.length);
  u16(prepared.length);
  u32(cdSize);
  u32(cdStart);
  u16(0); // 注释长度

  return out;
}
