export function addImage(images,buffer){
 const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
 const bytes=new Uint8Array(buffer);if(bytes.length>5*1024*1024)fail(413,'画像は5MB以下にしてください。');
 let ext;
 if(bytes.length>12&&bytes.slice(0,8).every((v,i)=>v===[137,80,78,71,13,10,26,10][i]))ext='png';
 else if(bytes.length>12&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)ext='jpg';
 else if(bytes.length>12&&new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP')ext='webp';
 else fail(415,'JPEG・PNG・WebP形式の画像を選択してください。');
 const url=`/uploads/${crypto.randomUUID()}.${ext}`;images.set(url,bytes);return url;
}
