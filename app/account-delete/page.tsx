import Link from "next/link";

export const metadata = { title: "계정 삭제 안내 · 내신랩" };

export default function AccountDeletePage() {
  return (
    <article className="panel panel-body legal">
      <h1>계정 삭제 안내</h1>
      <p>내신랩(개발: 내신랩)은 앱과 웹 어디서든 직접 계정을 삭제할 수 있어요.</p>
      <h2>삭제하는 방법</h2>
      <ol>
        <li>내신랩에 로그인한 뒤 <Link href="/me">내 정보</Link>로 가요.</li>
        <li>맨 아래 <b>회원 탈퇴</b>를 누르고 &ldquo;탈퇴&rdquo;를 입력한 뒤 <b>계정 영구 삭제</b>를 눌러요.</li>
        <li>바로 삭제되고 처음 화면으로 돌아가요.</li>
      </ol>
      <p>앱에 들어갈 수 없다면 가입한 Google 계정 이메일로 <a href="mailto:110412pgh@gmail.com">110412pgh@gmail.com</a>에 &ldquo;계정 삭제 요청&rdquo;을 보내 주세요. 본인 확인 뒤 7일 안에 삭제해요.</p>
      <h2>삭제되는 정보</h2>
      <ul>
        <li>별명, 학교·학년, 점수와 랭킹 기록, 문제 풀이·제출 기록, 오답 노트, 예상 시험 기록</li>
        <li>질문방에 쓴 질문·답변·추천, 문제 신고, 접속 기록</li>
        <li>로그인 계정(Google 연결 정보 포함)</li>
      </ul>
      <h2>남는 정보</h2>
      <ul>
        <li>내가 제안해서 이미 공개된 문제는 다른 학생들이 계속 풀 수 있도록 남기고, 작성자 표시는 &ldquo;탈퇴한 학생&rdquo;으로 바꿔요. 개인을 알아볼 수 있는 정보는 남지 않아요.</li>
        <li>삭제한 정보는 따로 보관하지 않으며 되돌릴 수 없어요.</li>
      </ul>
    </article>
  );
}
