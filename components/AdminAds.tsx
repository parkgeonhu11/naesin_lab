"use client";
import { useCallback, useEffect, useState } from "react";
import { friendly, sb } from "@/lib/supabase";

type Ad = {
  id: number; title: string; body: string; image_url: string; link_url: string; advertiser: string; placement: string;
  starts_at: string | null; ends_at: string | null; active: boolean; created_at: string; updated_at: string;
  views: number; clicks: number; reports: number; enabled: boolean;
};
const PLACE: Record<string, string> = { home: "홈 (내 기록 아래)", list: "문제 목록 (표 아래)", ranking: "랭킹 (표 아래)" };
const empty = { id: null as number | null, title: "", body: "", image_url: "", link_url: "https://", advertiser: "", placement: "home", starts_at: "", ends_at: "", active: false };
const toLocal = (s: string | null) => (s ? new Date(new Date(s).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

/** 관리자: 광고 영역 (직접 등록 배너). 전체 스위치는 기본 꺼짐 */
export default function AdminAds() {
  const [open, setOpen] = useState(false);
  const [ads, setAds] = useState<Ad[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [f, setF] = useState(empty);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [{ data }, { data: on }] = await Promise.all([sb().rpc("admin_ads"), sb().rpc("ads_enabled_admin")]);
    setAds((data as Ad[]) ?? []);
    setEnabled(!!on);
  }, []);
  useEffect(() => { if (open) load(); }, [open, load]);

  const save = async () => {
    setBusy(true);
    setMsg("");
    const { error } = await sb().rpc("admin_save_ad", {
      p_id: f.id, p_title: f.title, p_body: f.body, p_image_url: f.image_url, p_link_url: f.link_url, p_advertiser: f.advertiser,
      p_placement: f.placement, p_starts_at: f.starts_at ? new Date(f.starts_at).toISOString() : null, p_ends_at: f.ends_at ? new Date(f.ends_at).toISOString() : null, p_active: f.active,
    });
    setBusy(false);
    if (error) return setMsg(friendly(error));
    setMsg("저장했어.");
    setF(empty);
    load();
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>광고 영역</h2>
        <span className={`badge ${enabled ? "lv2" : ""}`}>{enabled ? "광고 켜짐" : "광고 꺼짐"}</span>
        <button type="button" className="btn line push-right" onClick={() => setOpen((v) => !v)}>{open ? "접기" : "열기"}</button>
      </div>
      {open && (
        <div className="panel-body" style={{ display: "grid", gap: 12 }}>
          <div className="notice small">
            광고 공급 방식(직접 배너 / 광고 네트워크)은 아직 정하지 않았어. 지금은 직접 등록한 배너만 보여 줄 수 있고, 아래 스위치가 꺼져 있으면 아무 광고도 안 보여.
            광고는 홈·문제 목록·랭킹의 아래쪽에만 나오고, 문제 풀이 화면이나 답 제출·다음 문제 버튼 옆에는 나오지 않아. 학교·학년·성적 같은 정보는 광고를 고르는 데 쓰지 않아.
            <b> 실제 광고를 걸기 전에 광고 계약, 청소년 대상 광고 규정, 앱스토어 정책을 꼭 확인해 줘.</b>
          </div>
          <label className="row" style={{ gap: 8 }}>
            <input type="checkbox" checked={enabled} onChange={async (e) => {
              const on = e.target.checked;
              const { error } = await sb().rpc("admin_set_ads_enabled", { p_on: on });
              if (error) return setMsg(friendly(error));
              setEnabled(on);
            }} />
            <span>사이트 전체에서 광고 보이기</span>
          </label>

          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>광고</th><th>위치</th><th>기간</th><th className="c">게시</th><th className="r">노출</th><th className="r">클릭</th><th className="r">신고</th><th /></tr></thead>
              <tbody>
                {ads.length === 0 && <tr><td colSpan={8} className="empty-cell">등록한 광고가 없어.</td></tr>}
                {ads.map((a) => (
                  <tr key={a.id}>
                    <td><b>{a.title}</b><div className="small faint">{a.advertiser} · {a.link_url}</div></td>
                    <td className="small">{PLACE[a.placement] ?? a.placement}</td>
                    <td className="small nowrap">{a.starts_at ? new Date(a.starts_at).toLocaleDateString("ko-KR") : "바로"} ~ {a.ends_at ? new Date(a.ends_at).toLocaleDateString("ko-KR") : "계속"}</td>
                    <td className="c">{a.active ? "게시" : "중지"}</td>
                    <td className="r n">{a.views}</td>
                    <td className="r n">{a.clicks}</td>
                    <td className={`r n ${a.reports ? "res-wa" : ""}`}>{a.reports}</td>
                    <td className="nowrap">
                      <button type="button" className="btn line" onClick={() => setF({ id: a.id, title: a.title, body: a.body, image_url: a.image_url, link_url: a.link_url, advertiser: a.advertiser, placement: a.placement, starts_at: toLocal(a.starts_at), ends_at: toLocal(a.ends_at), active: a.active })}>고치기</button>{" "}
                      <button type="button" className="btn line" onClick={async () => { await sb().rpc("admin_archive_ad", { p_id: a.id }); load(); }}>내리기</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form className="admin-edit" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <b>{f.id ? `광고 고치기 (#${f.id})` : "새 광고 등록"}</b>
            <label className="small muted">제목 (60자)<input className="input" required maxLength={60} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
            <label className="small muted">설명 (120자, 선택)<input className="input" maxLength={120} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></label>
            <label className="small muted">연결 주소 (https://)<input className="input" required type="url" value={f.link_url} onChange={(e) => setF({ ...f, link_url: e.target.value })} /></label>
            <label className="small muted">이미지 주소 (https://, 선택)<input className="input" type="url" value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} /></label>
            <label className="small muted">광고주<input className="input" maxLength={60} value={f.advertiser} onChange={(e) => setF({ ...f, advertiser: e.target.value })} /></label>
            <label className="small muted">위치
              <select value={f.placement} onChange={(e) => setF({ ...f, placement: e.target.value })}>
                {Object.entries(PLACE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <div className="row" style={{ gap: 8 }}>
              <label className="small muted">시작<input className="input" type="datetime-local" value={f.starts_at} onChange={(e) => setF({ ...f, starts_at: e.target.value })} /></label>
              <label className="small muted">끝<input className="input" type="datetime-local" value={f.ends_at} onChange={(e) => setF({ ...f, ends_at: e.target.value })} /></label>
            </div>
            <label className="row small" style={{ gap: 8 }}><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> 게시하기</label>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn" disabled={busy}>{f.id ? "고친 내용 저장" : "등록"}</button>
              {f.id && <button type="button" className="btn line" onClick={() => setF(empty)}>새로 쓰기</button>}
              {msg && <span className="small muted">{msg}</span>}
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
