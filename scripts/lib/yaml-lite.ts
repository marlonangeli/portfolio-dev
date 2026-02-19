import fs from "fs";

function parseScalar(value: string): unknown {
  const v = value.trim();
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null") return null;
  if (/^-?\d+$/.test(v)) return Number(v);
  if (/^-?\d+\.\d+$/.test(v)) return Number(v);
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

export function parseYaml(text: string, filePath = "inline.yaml"): unknown {
  const lines = text.replace(/\r/g, "").split("\n");

  function nextMeaningfulIndex(start: number): number {
    let i = start;
    while (i < lines.length) {
      const raw = lines[i] ?? "";
      if (raw.trim() === "" || raw.trim().startsWith("#")) {
        i += 1;
        continue;
      }
      return i;
    }
    return i;
  }

  function parseBlock(start: number, indent: number): { value: unknown; next: number } {
    let i = nextMeaningfulIndex(start);
    if (i >= lines.length) return { value: null, next: i };

    const first = lines[i] ?? "";
    const firstIndent = first.match(/^\s*/)?.[0].length ?? 0;
    if (firstIndent < indent) return { value: null, next: i };
    if (firstIndent > indent) {
      throw new Error(`Invalid indentation at line ${i + 1} in ${filePath}`);
    }

    const isArray = first.trim() === "-" || first.trim().startsWith("- ");
    if (isArray) {
      const arr: unknown[] = [];
      while (i < lines.length) {
        i = nextMeaningfulIndex(i);
        if (i >= lines.length) break;

        const line = lines[i] ?? "";
        const curIndent = line.match(/^\s*/)?.[0].length ?? 0;
        const trimmed = line.trim();
        if (curIndent < indent) break;
        if (curIndent > indent) {
          throw new Error(`Unexpected indentation at line ${i + 1} in ${filePath}`);
        }
        if (!(trimmed === "-" || trimmed.startsWith("- "))) break;

        const itemBody = trimmed === "-" ? "" : trimmed.slice(2).trim();
        if (itemBody === "") {
          const nested = parseBlock(i + 1, indent + 2);
          arr.push(nested.value);
          i = nested.next;
          continue;
        }

        if (itemBody.includes(":")) {
          const idx = itemBody.indexOf(":");
          const key = itemBody.slice(0, idx).trim();
          const rawValue = itemBody.slice(idx + 1).trim();
          const obj: Record<string, unknown> = {};

          if (rawValue === "") {
            const nested = parseBlock(i + 1, indent + 4);
            obj[key] = nested.value;
            i = nested.next;
          } else {
            obj[key] = parseScalar(rawValue);
            i += 1;
          }

          while (i < lines.length) {
            i = nextMeaningfulIndex(i);
            if (i >= lines.length) break;

            const extLine = lines[i] ?? "";
            const extIndent = extLine.match(/^\s*/)?.[0].length ?? 0;
            const extTrim = extLine.trim();
            if (extIndent < indent + 2) break;
            if (extIndent === indent && extTrim.startsWith("- ")) break;
            if (extIndent !== indent + 2) {
              throw new Error(`Invalid object indentation at line ${i + 1} in ${filePath}`);
            }

            const extIdx = extTrim.indexOf(":");
            if (extIdx < 1) {
              throw new Error(`Expected key: value at line ${i + 1} in ${filePath}`);
            }

            const extKey = extTrim.slice(0, extIdx).trim();
            const extRaw = extTrim.slice(extIdx + 1).trim();
            if (extRaw === "") {
              const nested = parseBlock(i + 1, extIndent + 2);
              obj[extKey] = nested.value;
              i = nested.next;
            } else {
              obj[extKey] = parseScalar(extRaw);
              i += 1;
            }
          }

          arr.push(obj);
          continue;
        }

        arr.push(parseScalar(itemBody));
        i += 1;
      }
      return { value: arr, next: i };
    }

    const obj: Record<string, unknown> = {};
    while (i < lines.length) {
      i = nextMeaningfulIndex(i);
      if (i >= lines.length) break;

      const line = lines[i] ?? "";
      const curIndent = line.match(/^\s*/)?.[0].length ?? 0;
      if (curIndent < indent) break;
      if (curIndent > indent) {
        throw new Error(`Unexpected indentation at line ${i + 1} in ${filePath}`);
      }

      const trimmed = line.trim();
      const idx = trimmed.indexOf(":");
      if (idx < 1) {
        throw new Error(`Expected key: value at line ${i + 1} in ${filePath}`);
      }

      const key = trimmed.slice(0, idx).trim();
      const rawValue = trimmed.slice(idx + 1).trim();
      if (rawValue === "") {
        const nested = parseBlock(i + 1, indent + 2);
        obj[key] = nested.value;
        i = nested.next;
      } else {
        obj[key] = parseScalar(rawValue);
        i += 1;
      }
    }

    return { value: obj, next: i };
  }

  return parseBlock(0, 0).value;
}

export function loadYamlFile(filePath: string): unknown {
  return parseYaml(fs.readFileSync(filePath, "utf8"), filePath);
}

function needsQuotes(value: string): boolean {
  return value === "" || /[:#\-\[\]\{\},&*!?|>"'%@`]/.test(value) || /^\s|\s$/.test(value);
}

function dumpScalar(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  const stringValue = String(value);
  if (needsQuotes(stringValue)) return JSON.stringify(stringValue);
  return stringValue;
}

export function dumpYaml(value: unknown, indent = 0): string {
  const pad = " ".repeat(indent);

  if (Array.isArray(value)) {
    if (value.length === 0) return `${pad}[]`;
    return value
      .map((item) => {
        if (item !== null && typeof item === "object") {
          const nested = dumpYaml(item, indent + 2);
          return `${pad}-\n${nested}`;
        }
        return `${pad}- ${dumpScalar(item)}`;
      })
      .join("\n");
  }

  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return `${pad}{}`;
    return entries
      .map(([key, val]) => {
        if (val !== null && typeof val === "object") {
          return `${pad}${key}:\n${dumpYaml(val, indent + 2)}`;
        }
        return `${pad}${key}: ${dumpScalar(val)}`;
      })
      .join("\n");
  }

  return `${pad}${dumpScalar(value)}`;
}

export function saveYamlFile(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${dumpYaml(value)}\n`, "utf8");
}
