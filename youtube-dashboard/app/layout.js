import './globals.css';

export const metadata = {
  title: '유튜브 채널 리포트',
  description: '태오의 실행 비즈니스 — 매일 아침 8시 자동 갱신',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
