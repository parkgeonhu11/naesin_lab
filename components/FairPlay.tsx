"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { useMe } from "@/lib/useMe";

/** 경고 창: 너무 빨리 맞힌 답이 여러 번 나온 학생에게만 보인다 */
export function WarningModal() {
  const { warned, ackWarning } = useMe();
  const dlg = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (warned && dlg.current && !dlg.current.open) dlg.current.showModal();
  }, [warned]);
  if (!warned) return null;
  return (
    <dialog ref={dlg} className="report-dlg warn-dlg" onCancel={(e) => e.preventDefault()} aria-labelledby="warn-title">
      <div className="report-form">
        <div className="warn-ic" aria-hidden="true">!</div>
        <h2 id="warn-title" style={{ margin: 0, fontSize: 19 }}>경고: 풀이 시간이 너무 짧은 정답이 여러 번 나왔어</h2>
        <p style={{ margin: 0 }}>
          문제를 읽는 데만 걸리는 시간보다 훨씬 빨리 맞힌 답이 <b>3번 이상</b> 나왔어. AI나 답지를 보고 푸는 건 친구들과의 공정한 경쟁을 망쳐.
        </p>
        <ul className="small" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
          <li>이 경고는 <b>너에게만</b> 보이고, 다른 친구들은 몰라.</li>
          <li>경고를 확인한 뒤에도 이런 답이 <b>2번 더</b> 나오면 <b>이용이 정지</b>되고 랭킹에서 빠져.</li>
          <li>오해라면 관리자에게 말해 줘. 관리자가 확인하고 풀어 줄 수 있어.</li>
        </ul>
        <button
          type="button"
          className="btn big"
          disabled={busy}
          onClick={async () => { setBusy(true); await ackWarning(); dlg.current?.close(); setBusy(false); }}
        >
          확인했어, 직접 풀게
        </button>
      </div>
    </dialog>
  );
}

/** 이용 정지 화면 */
export function BanScreen() {
  return (
    <div className="gate">
      <div className="gate-card">
        <div className="gate-brand">
          <span className="brand-mark"><Icon name="logo" /></span>
          <span><b>내신랩</b><small>서연중 3학년 2학기 시험 대비</small></span>
        </div>
        <h1>이용이 정지된 계정이야</h1>
        <p className="muted" style={{ margin: 0 }}>
          경고를 받은 뒤에도 문제를 읽는 시간보다 훨씬 빨리 맞힌 답이 계속 나와서 이용이 정지됐어. 랭킹에서도 빠졌어.
        </p>
        <p className="small muted" style={{ margin: 0 }}>오해라면 관리자에게 직접 말해 줘. 확인되면 정지를 풀어 줄 수 있어.</p>
      </div>
    </div>
  );
}
