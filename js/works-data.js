/* Work section — each image in image/works/ IS a sticky note (the note
   design, including its own background color, is baked into the image
   itself), displayed as-is pinned to the wall. This is a static site with
   no server-side directory listing, so this filename list has to be kept
   in sync by hand: whenever a new image is dropped into image/works/, add
   its filename here too.

   That's the only manual step — everything past this array is automatic
   per entry (see index.html): the note's display, its tilt, the lightbox,
   and the "책에서 보기" link to that same word's panel on the Words page
   all derive straight from the filename ("메모지_[제목].ext" → 제목), so a
   new file just needs a matching word to already exist on the Words page. */
const WORKS_ITEMS = [
  "메모지_날개.jpg",
  "메모지_그런 거.jpg",
  "메모지_눈물상자.jpg",
  "메모지_똑같은동그라미.jpg",
  "메모지_뜬구름 잡는 소리.jpg",
  "메모지_마음의 무늬.jpg",
  "메모지_메모.jpg",
  "메모지_명치.jpg",
  "메모지_물큰하게.jpg",
  "메모지_어렴풋이.jpg",
  "메모지_온전한 덩어리.jpg",
  "메모지_자석.jpg",
  "메모지_조각난 겨울 햇볕.jpg",
  "메모지_촛불의 빛.jpg",
  "메모지_검고 긴 바늘.jpg",
  "메모지_구멍.jpg",
  "메모지_낙관하자.jpg",
  "메모지_네-.jpg",
  "메모지_눈썹.jpg",
  "메모지_덧입혀진다.jpg",
  "메모지_슬래시.jpg",
  "메모지_씨방.jpg",
  "메모지_어깨.jpg",
  "메모지_역사.jpg",
  "메모지_자아.jpg",
  "메모지_차가운 각성.jpg",
  "메모지_허공의 무언가.jpg",
];
