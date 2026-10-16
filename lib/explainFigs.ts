/**
 * 해설에 넣는 그림. 해설 글 안에 [[그림:키]] 를 쓰면 그 자리에 아래 SVG가 들어간다.
 * 그림은 코드에만 있으니(사용자가 쓴 글은 그대로 글자로만 보임) 안전하다.
 * 색은 테마 변수(--brand, --wa, --ac …)와 currentColor를 써서 라이트/다크 모두 맞춘다.
 */
const FONT = `font-family="Pretendard Variable, Pretendard, -apple-system, Apple SD Gothic Neo, Malgun Gothic, sans-serif"`;

export const EXPLAIN_FIGS: Record<string, string> = {
  /* 1755 역학적 에너지: 트랙과 높이 */
  "sc-1755-track": `<svg width="380" height="262" viewBox="0 0 380 262" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A 20 m에서 출발해 마찰 구간 5 m를 지나 B 10 m를 거쳐 C 17 m까지 올라가는 그림">
<defs><pattern id="x1755h" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" style="stroke:var(--wa)" stroke-width="2"/></pattern></defs>
<line x1="20" y1="220" x2="365" y2="220" stroke="currentColor" stroke-opacity=".25"/>
<path d="M40 60 Q55 220 120 220 L260 220 Q330 220 345 50" fill="none" stroke="currentColor" stroke-width="2"/>
<rect x="160" y="214" width="70" height="8" fill="url(#x1755h)" style="stroke:var(--wa)" stroke-width=".8"/>
<g fill="none" stroke-dasharray="4 3">
<line x1="46" y1="60" x2="340" y2="60" stroke="currentColor" stroke-opacity=".45"/>
<line x1="46" y1="84" x2="336" y2="84" style="stroke:var(--wa)" stroke-width="1.3"/>
<line x1="56" y1="140" x2="325" y2="140" stroke="currentColor" stroke-opacity=".45"/>
</g>
<circle cx="40" cy="60" r="7" style="fill:var(--brand)"/>
<circle cx="341" cy="84" r="5" style="fill:var(--wa)"/>
<circle cx="330" cy="140" r="4" fill="currentColor"/>
<g ${FONT} font-size="13" fill="currentColor" text-anchor="middle">
<text x="200" y="53">A 높이 20 m (출발, 속력 0)</text>
<text x="200" y="77" font-weight="700" style="fill:var(--wa)">C 높이 h = 17 m</text>
<text x="200" y="133">B 높이 10 m (그냥 지나감)</text>
<text x="195" y="242" style="fill:var(--wa)">마찰 구간 5 m · 마찰력 12 N</text>
<text x="195" y="258" fill-opacity=".6" font-size="12">나머지 곡면·수평면은 매끄러움</text>
<text x="30" y="46" font-weight="700">A</text>
<text x="360" y="89" font-weight="700">C</text>
<text x="348" y="145" font-weight="700">B</text>
</g>
</svg>`,

  /* 1755 역학적 에너지: 에너지 막대 */
  "sc-1755-energy": `<svg width="380" height="252" viewBox="0 0 380 252" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A에서 위치 에너지 400 J, 마찰 구간 뒤 운동 에너지 340 J와 열 60 J, C에서 위치 에너지 340 J">
<line x1="30" y1="200" x2="350" y2="200" stroke="currentColor" stroke-opacity=".3"/>
<rect x="45" y="40" width="74" height="160" rx="6" style="fill:var(--brand-soft);stroke:var(--brand)"/>
<rect x="155" y="40" width="74" height="24" rx="6" fill="none" style="stroke:var(--wa)" stroke-dasharray="4 3" stroke-width="1.2"/>
<rect x="155" y="64" width="74" height="136" rx="6" style="fill:var(--ac-soft);stroke:var(--ac)"/>
<rect x="265" y="64" width="74" height="136" rx="6" style="fill:var(--brand-soft);stroke:var(--brand)"/>
<g ${FONT} font-size="13" fill="currentColor" text-anchor="middle">
<text x="82" y="112" font-weight="700">위치</text><text x="82" y="132">400 J</text>
<text x="192" y="57" font-size="12" style="fill:var(--wa)">열 60 J</text>
<text x="192" y="124" font-weight="700">운동</text><text x="192" y="144">340 J</text>
<text x="302" y="124" font-weight="700">위치</text><text x="302" y="144">340 J</text>
<text x="82" y="222" font-weight="700">A 출발</text>
<text x="192" y="222" font-weight="700">마찰 구간 뒤</text>
<text x="302" y="222" font-weight="700">최고점 C</text>
<text x="82" y="242" font-size="12" fill-opacity=".65">2×10×20</text>
<text x="192" y="242" font-size="12" fill-opacity=".65">400 − 12×5</text>
<text x="302" y="242" font-size="12" fill-opacity=".65">2×10×h</text>
</g>
</svg>`,
};
