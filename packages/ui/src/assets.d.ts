/**
 * @file 이미지 import 타입. 앱은 Next의 `next/image-types/global`이 같은 모양을 선언하지만
 * 이 패키지는 next에 의존하지 않아 `tsc --noEmit`이 webp import를 모른다. Next(Turbopack)가
 * 번들하면 `/_next/static/media/<이름>.<해시>.webp` 경로와 픽셀 크기가 온다 (KAN-624).
 */
declare module "*.webp" {
  const image: { src: string; width: number; height: number };
  export default image;
}
