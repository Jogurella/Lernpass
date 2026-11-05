// Keys are opaque credentials. Google checks their validity; do not assume a legacy prefix or alphabet.
export function normalizeKey(value){
 const key=typeof value==='string'?value.trim():'';
 return key.length>=20&&key.length<=4096&&/^[\x21-\x7e]+$/.test(key)?key:null;
}
