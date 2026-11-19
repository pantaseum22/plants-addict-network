// 依存パッケージ不要のZIP（無圧縮・UTF-8）。ブラウザで更新一式を書き出す。
const encoder=new TextEncoder();
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
const crc32=bytes=>{let crc=0xffffffff;for(const b of bytes)crc=crcTable[(crc^b)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;};
export function zipFiles(files){
 const parts=[],directory=[];let offset=0,total=0;
 const entries=Object.entries(files);if(entries.length>65535)throw new Error('ファイルが多すぎます。');
 for(const [name,value] of entries){
  if(!name||name.startsWith('/')||name.split('/').some(p=>p==='..')||/[\\\x00-\x1f]/.test(name))throw new Error('不正なファイル名です。');
  const filename=encoder.encode(name),bytes=typeof value==='string'?encoder.encode(value):new Uint8Array(value);
  total+=bytes.length;if(total>100*1024*1024)throw new Error('書き出す画像の合計が100MBを超えています。画像を小さくしてください。');
  const crc=crc32(bytes),local=new Uint8Array(30+filename.length),l=new DataView(local.buffer);
  l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x0800,true);l.setUint16(12,33,true);l.setUint32(14,crc,true);l.setUint32(18,bytes.length,true);l.setUint32(22,bytes.length,true);l.setUint16(26,filename.length,true);local.set(filename,30);
  const central=new Uint8Array(46+filename.length),c=new DataView(central.buffer);
  c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(14,33,true);c.setUint32(16,crc,true);c.setUint32(20,bytes.length,true);c.setUint32(24,bytes.length,true);c.setUint16(28,filename.length,true);c.setUint32(42,offset,true);central.set(filename,46);
  parts.push(local,bytes);directory.push(central);offset+=local.length+bytes.length;
 }
 const size=directory.reduce((sum,p)=>sum+p.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);
 v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,size,true);v.setUint32(16,offset,true);
 return new Blob([...parts,...directory,end],{type:'application/zip'});
}
