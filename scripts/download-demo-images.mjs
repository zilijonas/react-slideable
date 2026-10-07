import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('public/images', { recursive: true });
const images = [
  'photo-1476514525535-07fb3b4ae5f1',
  'photo-1464822759023-fed622ff2c3b',
  'photo-1448375240586-882707db888b',
  'photo-1509316785289-025f5b846b35',
  'photo-1473116763249-2faaef81ccda',
];
for (let i = 0; i < images.length; i++) {
  const response = await fetch(`https://images.unsplash.com/${images[i]}?auto=format&fit=crop&w=900&q=85`);
  if (!response.ok) throw new Error(`${images[i]}: ${response.status}`);
  await writeFile(`public/images/destination-${i + 1}.jpg`, new Uint8Array(await response.arrayBuffer()));
  console.log(`Saved destination-${i + 1}.jpg`);
}
