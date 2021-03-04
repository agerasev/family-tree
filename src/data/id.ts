
const idBytes = 4;
const idLength = 2 * idBytes;
const idCharMap = "0123456789abcdef";

export function idCheck(id: string) {
  if (id.length !== idLength) {
    throw Error(`Bad id length ${id.length}, must be ${idLength}`);
  }
  for (let char of id) {
    if (!idCharMap.includes(char)) {
      throw Error(`Unsupported symbol '${char}' in identifier, only following symbols are supported: '${idCharMap}'`);
    }
  }
  if (id !== idFromArray(idToArray(id))) {
    throw Error(`Identifier conversion failed`);
  }
}

export function idToArray(id: string): Uint32Array {
  let array = new Uint32Array(idBytes / 4);
  for (let i = 0; i < array.length; ++i) {
    const u32s = id.substr(8 * i, 8);
    array[i] = parseInt(u32s, 16);
  }
  return array;
}

export function idFromArray(array: Uint32Array): string {
  let str = "";
  for (let i = 0; i < array.length; ++i) {
    let u32s = array[i].toString(16);
    str += ("00000000" + u32s).substr(u32s.length);
  }
  return str;
}

export function arrayEquals(first: Uint32Array, second: Uint32Array): boolean {
  if (first.length !== second.length) {
    return false;
  }
  for (let i = 0; i < first.length; ++i) {
    if (first[i] !== second[i]) {
      return false;
    } 
  }
  return true;
}

export function mixIds(a: string, b: string): string {
  let output = new Uint32Array(idBytes / 4);
  let [first, second] = [idToArray(a), idToArray(b)];
  for (let i = 0; i < output.length; ++i) {
    output[i] = first[i] ^ second[i];
  }
  return idFromArray(output);
}

export function randomId(): string {
  let output = new Uint32Array(idBytes / 4);
  for (let i = 0; i < output.length; ++i) {
    output[i] = Math.random() * (4.0 * (1 << 30));
  }
  return idFromArray(output);
}
