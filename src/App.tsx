import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

/* ------------------------------------------------------------------ */
/*  定数・型                                                           */
/* ------------------------------------------------------------------ */

const MORNING_COLOR = "#f97316";
const NIGHT_COLOR = "#0ea5e9";
const TARGET_COLOR = "#94a3b8";

const MEALS = [
  { value: "◎", label: "◎ 多め" },
  { value: "○", label: "○ 普通" },
  { value: "△", label: "△ 少なめ" },
  { value: "×", label: "× なし" },
] as const;

type Role = "guest" | "member" | "admin";
type Tab = "member" | "admin";

type Member = {
  id?: string;
  name: string;
  passcode: string;
  target_weight: string;
};

type RecordItem = {
  id: string;
  member_name: string;
  date: string;
  morning_weight: string;
  night_weight: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  reflection: string;
  admin_reply: string;
};

type FormState = {
  date: string;
  morning_weight: string;
  night_weight: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  reflection: string;
  admin_reply: string;
};

type ChartPoint = {
  date: string;
  morning: number | null;
  night: number | null;
};

const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() + d.getTimezoneOffset() + 540); return d.toISOString().slice(0, 10); };

const initialForm: FormState = {
  date: today(),
  morning_weight: "",
  night_weight: "",
  breakfast: "○",
  lunch: "○",
  dinner: "○",
  reflection: "",
  admin_reply: "",
};

/* ------------------------------------------------------------------ */
/*  ユーティリティ                                                      */
/* ------------------------------------------------------------------ */

function fmtWeight(value: string | number | null | undefined) {
  if (
    value === "" ||
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
  )
    return "-";
  return `${Number(value).toFixed(1)} kg`;
}

function formatShortDate(value: string) {
  if (!value || !value.includes("-")) return value;
  const [, month, day] = value.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function getMonthKey(value: string) {
  return value.slice(0, 7);
}

function formatMonthLabel(monthKey: string) {
  if (!monthKey || !monthKey.includes("-")) return monthKey;
  const [, month] = monthKey.split("-");
  return `${Number(month)}月グラフ`;
}

function formatMonthSearchLabel(monthKey: string) {
  if (!monthKey || !monthKey.includes("-")) return monthKey;
  const [year, month] = monthKey.split("-");
  return `${year}年${Number(month)}月`;
}

function avg(values: number[]) {
  if (!values.length) return null;
  return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
}

function toChartData(items: RecordItem[]): ChartPoint[] {
  return items.map((r) => ({
    date: formatShortDate(r.date),
    morning: r.morning_weight === "" ? null : Number(r.morning_weight),
    night: r.night_weight === "" ? null : Number(r.night_weight),
  }));
}

function chipClass(v: string) {
  if (v === "◎") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (v === "○") return "bg-sky-100 text-sky-700 border-sky-200";
  if (v === "△") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-rose-100 text-rose-700 border-rose-200";
}

/* ------------------------------------------------------------------ */
/*  小コンポーネント                                                    */
/* ------------------------------------------------------------------ */

function StatCard({
  title,
  value,
}: {
  title: string;
  value: React.ReactNode;
}) {
  return (
    <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-slate-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-lg font-bold text-slate-800 md:text-2xl">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function MealBadge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex min-w-10 items-center justify-center rounded-full border px-3 py-1 text-sm font-semibold ${chipClass(value)}`}
    >
      {value}
    </span>
  );
}

function WeightChartCard({
  title,
  data,
  targetWeight,
}: {
  title: string;
  data: ChartPoint[];
  targetWeight?: string;
}) {
  return (
    <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 sm:gap-4 sm:text-sm">
          <span>横軸：日付　縦軸：体重（kg）</span>
          <span className="inline-flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: MORNING_COLOR }}
            />
            朝
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: NIGHT_COLOR }}
            />
            夜
          </span>
        </div>
        <div className="h-[260px] w-full sm:h-[320px] md:h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 16, left: 10, bottom: 12 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                fontSize={12}
                tickMargin={10}
                minTickGap={12}
              />
              <YAxis
                domain={["dataMin - 1", "dataMax + 1"]}
                fontSize={12}
                width={50}
                label={{
                  value: "体重 (kg)",
                  angle: -90,
                  position: "insideLeft",
                }}
              />
              <Tooltip />
              {targetWeight && (
                <ReferenceLine
                  y={Number(targetWeight)}
                  stroke={TARGET_COLOR}
                  strokeDasharray="6 6"
                  label={{
                    value: `目標 ${Number(targetWeight).toFixed(1)}kg`,
                    position: "insideTopRight",
                    fontSize: 12,
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="morning"
                name="朝"
                stroke={MORNING_COLOR}
                strokeWidth={3}
                dot={{ r: 3, fill: MORNING_COLOR }}
                activeDot={{ r: 5 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="night"
                name="夜"
                stroke={NIGHT_COLOR}
                strokeWidth={3}
                dot={{ r: 3, fill: NIGHT_COLOR }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  メインアプリ                                                        */
/* ------------------------------------------------------------------ */


function WeightPicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const parsed = value ? Number(value) : 56.0;
  const tens = Math.floor(parsed / 10) % 10;
  const ones = Math.floor(parsed) % 10;
  const dec = Math.round((parsed % 1) * 10);

  const buildValue = (t: number, o: number, d: number) => {
    onChange((t * 10 + o + d * 0.1).toFixed(1));
  };

  const Drum = ({ items, selected, onSelect }: { items: number[]; selected: number; onSelect: (n: number) => void }) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const startY = React.useRef(0);
    const startScroll = React.useRef(0);
    const isDragging = React.useRef(false);
    const ITEM_H = 48;

    React.useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const idx = items.indexOf(selected);
      el.scrollTop = idx * ITEM_H;
    }, []);

    const snap = () => {
      const el = containerRef.current;
      if (!el) return;
      const idx = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(idx, items.length - 1));
      el.scrollTo({ top: clamped * ITEM_H, behavior: "smooth" });
      if (items[clamped] !== selected) onSelect(items[clamped]);
    };

    const onTouchStart = (e: React.TouchEvent) => {
      isDragging.current = true;
      startY.current = e.touches[0].clientY;
      startScroll.current = containerRef.current?.scrollTop || 0;
    };
    const onTouchMove = (e: React.TouchEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      e.stopPropagation();
      const dy = startY.current - e.touches[0].clientY;
      containerRef.current.scrollTop = startScroll.current + dy;
    };
    const onTouchEnd = () => { isDragging.current = false; snap(); };

    return (
      <div style={{ position: "relative", height: ITEM_H * 3, width: 56, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: ITEM_H, left: 0, right: 0, height: ITEM_H, background: "#f1f5f9", borderRadius: 10, border: "2px solid #3b82f6", zIndex: 0, pointerEvents: "none" }} />
        <div
          ref={containerRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ position: "relative", zIndex: 1, height: ITEM_H * 3, overflowY: "scroll", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", touchAction: "none" }}
        >
          <div style={{ height: ITEM_H }} />
          {items.map((n) => {
            const active = n === selected;
            return (
              <div key={n} onClick={() => { onSelect(n); const el = containerRef.current; if (el) { const idx = items.indexOf(n); el.scrollTo({ top: idx * ITEM_H, behavior: "smooth" }); }}} style={{ height: ITEM_H, display: "flex", alignItems: "center", justifyContent: "center", fontSize: active ? 26 : 18, fontWeight: active ? 700 : 400, color: active ? "#0f172a" : "#cbd5e1", cursor: "pointer", userSelect: "none", transition: "all 0.1s" }}>{n}</div>
            );
          })}
          <div style={{ height: ITEM_H }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: "#334155", marginBottom: 10 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 2, justifyContent: "center" }}>
        <Drum items={[3,4,5,6,7,8,9]} selected={tens} onSelect={(t) => buildValue(t, ones, dec)} />
        <Drum items={[0,1,2,3,4,5,6,7,8,9]} selected={ones} onSelect={(o) => buildValue(tens, o, dec)} />
        <div style={{ fontSize: 28, fontWeight: 700, color: "#334155", padding: "0 1px", alignSelf: "center" }}>.</div>
        <Drum items={[0,1,2,3,4,5,6,7,8,9]} selected={dec} onSelect={(d) => buildValue(tens, ones, d)} />
        <div style={{ fontSize: 16, color: "#64748b", marginLeft: 6, alignSelf: "center" }}>kg</div>
      </div>
    </div>
  );
}

export default function WeightManagementApp() {
  /* ---------- state ---------- */
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [adminPasscode, setAdminPasscode] = useState("");
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [role, setRole] = useState<Role>("guest");
  const [tab, setTab] = useState<Tab>("member");
  const [currentMemberName, setCurrentMemberName] = useState("");
  const [selectedMember, setSelectedMember] = useState("");

  const [adminSetupInput, setAdminSetupInput] = useState("");
  const [adminLoginInput, setAdminLoginInput] = useState("");
  const [memberLoginName, setMemberLoginName] = useState("");
  const [memberLoginPasscode, setMemberLoginPasscode] = useState("");

  const [showAdminReset, setShowAdminReset] = useState(false);
  const [adminResetInput, setAdminResetInput] = useState("");
  const [adminResetConfirmInput, setAdminResetConfirmInput] = useState("");

  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPasscode, setNewMemberPasscode] = useState("");
  const [newMemberTargetWeight, setNewMemberTargetWeight] = useState("");
  const [targetWeightInput, setTargetWeightInput] = useState("");
  const [searchedMonthKey, setSearchedMonthKey] = useState("");

  const [message, setMessage] = useState("");

  /* ---------- Supabase: 初期読み込み ---------- */
  const fetchAll = useCallback(async () => {
    try {
      // 管理者パスコード
      const { data: settingsData } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "admin_passcode")
        .maybeSingle();
      setAdminPasscode(settingsData?.value ?? "");

      // 会員一覧
      const { data: membersData } = await supabase
        .from("members")
        .select("*")
        .order("name");
      setMembers(
        (membersData ?? []).map((m: any) => ({
          id: m.id,
          name: m.name,
          passcode: m.passcode,
          target_weight: m.target_weight ?? "",
        }))
      );

      // 記録一覧
      const { data: recordsData } = await supabase
        .from("records")
        .select("*")
        .order("date", { ascending: true });
      setRecords(
        (recordsData ?? []).map((r: any) => ({
          id: r.id,
          member_name: r.member_name,
          date: r.date,
          morning_weight: r.morning_weight ?? "",
          night_weight: r.night_weight ?? "",
          breakfast: r.breakfast ?? "○",
          lunch: r.lunch ?? "○",
          dinner: r.dinner ?? "○",
          reflection: r.reflection ?? "",
          admin_reply: r.admin_reply ?? "",
        }))
      );
    } catch (err) {
      console.error("データ読み込みエラー:", err);
      setMessage("データの読み込みに失敗しました。ページを再読み込みしてください。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll().then(() => {
      try {
        const saved = localStorage.getItem("onestep_session");
        if (saved) {
          const s = JSON.parse(saved);
          if (s.role === "member" && s.name) {
            setCurrentMemberName(s.name);
            setRole("member");
          } else if (s.role === "admin") {
            setRole("admin");
          }
        }
      } catch {}
    });
  }, [fetchAll]);

  /* ---------- 派生データ ---------- */
  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => a.name.localeCompare(b.name, "ja")),
    [members]
  );

  useEffect(() => {
    if (role === "admin" && !selectedMember && sortedMembers.length > 0)
      setSelectedMember(sortedMembers[0].name);
  }, [role, selectedMember, sortedMembers]);

  const activeMemberName =
    role === "member" ? currentMemberName : selectedMember;
  const activeMember = useMemo(
    () => sortedMembers.find((m) => m.name === activeMemberName) || null,
    [sortedMembers, activeMemberName]
  );

  useEffect(() => {
    setTargetWeightInput(activeMember?.target_weight || "");
  }, [activeMember]);

  useEffect(() => {
    setSearchedMonthKey("");
  }, [role, currentMemberName, selectedMember]);

  const visibleRecords = useMemo(() => {
    if (role === "member")
      return records.filter((r) => r.member_name === currentMemberName);
    if (role === "admin") {
      if (selectedMember === "all") return records;
      return records.filter((r) => r.member_name === selectedMember);
    }
    return [] as RecordItem[];
  }, [records, role, currentMemberName, selectedMember]);

  const statRecords = useMemo(() => {
    if (role === "member") return visibleRecords;
    if (role === "admin" && selectedMember && selectedMember !== "all")
      return visibleRecords;
    return [] as RecordItem[];
  }, [visibleRecords, role, selectedMember]);

  const overallChartData = useMemo(
    () => toChartData(statRecords),
    [statRecords]
  );

  const monthGroups = useMemo(() => {
    const groups: Record<string, RecordItem[]> = {};
    statRecords.forEach((item) => {
      const key = getMonthKey(item.date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [statRecords]);

  const monthKeys = useMemo(
    () => Object.keys(monthGroups).sort(),
    [monthGroups]
  );
  const recentMonthKeys = useMemo(() => monthKeys.slice(-3), [monthKeys]);
  const archivedMonthKeys = useMemo(() => monthKeys.slice(0, -3), [monthKeys]);
  const searchedMonthData = useMemo(() => {
    if (!searchedMonthKey || !monthGroups[searchedMonthKey])
      return [] as ChartPoint[];
    return toChartData(monthGroups[searchedMonthKey]);
  }, [searchedMonthKey, monthGroups]);

  const latest = statRecords.length
    ? statRecords[statRecords.length - 1]
    : null;

  const pairDiff = (key: "morning_weight" | "night_weight") => {
    const xs = statRecords.filter((r) => r[key] !== "");
    if (xs.length < 2) return null;
    return (
      Number(xs[xs.length - 1][key]) - Number(xs[xs.length - 2][key])
    ).toFixed(1);
  };

  const morningDiff = pairDiff("morning_weight");
  const nightDiff = pairDiff("night_weight");

  const morning7 = avg(
    statRecords
      .slice(-7)
      .map((r) => r.morning_weight)
      .filter(Boolean)
      .map(Number)
  );
  const night7 = avg(
    statRecords
      .slice(-7)
      .map((r) => r.night_weight)
      .filter(Boolean)
      .map(Number)
  );
  const morning30 = avg(
    statRecords
      .slice(-30)
      .map((r) => r.morning_weight)
      .filter(Boolean)
      .map(Number)
  );
  const night30 = avg(
    statRecords
      .slice(-30)
      .map((r) => r.night_weight)
      .filter(Boolean)
      .map(Number)
  );

  const morningGap =
    latest &&
    latest.morning_weight !== "" &&
    activeMember?.target_weight
      ? (
          Number(latest.morning_weight) - Number(activeMember.target_weight)
        ).toFixed(1)
      : null;
  const nightGap =
    latest &&
    latest.night_weight !== "" &&
    activeMember?.target_weight
      ? (
          Number(latest.night_weight) - Number(activeMember.target_weight)
        ).toFixed(1)
      : null;

  /* ---------- フォーム操作 ---------- */
  const resetForm = () => {
    setForm((prev) => ({ ...initialForm, date: today(), morning_weight: prev.morning_weight, night_weight: prev.night_weight }));
    setEditingId(null);
  };

  const change = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  /* ---------- 認証アクション ---------- */
  const logout = () => {
    setRole("guest");
    setCurrentMemberName("");
    setSelectedMember("");
    setEditingId(null);
    setMemberLoginName("");
    setMemberLoginPasscode("");
    setAdminLoginInput("");
    setAdminResetInput("");
    setAdminResetConfirmInput("");
    setShowAdminReset(false);
    setForm(initialForm);
    localStorage.removeItem("onestep_session");
    setMessage("ログアウトしました。");
  };

  const setupAdmin = async () => {
    if (!adminSetupInput.trim())
      return setMessage("最初に管理者パスコードを設定してください。");
    const code = adminSetupInput.trim();
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "admin_passcode", value: code });
    if (error) return setMessage("保存に失敗しました。");
    setAdminPasscode(code);
    setAdminSetupInput("");
    setRole("admin");
    setMessage("管理者パスコードを設定しました。続けて会員登録ができます。");
  };

  const loginAdmin = () => {
    if (adminLoginInput !== adminPasscode)
      return setMessage("管理者パスコードが一致しません。");
    setRole("admin");
    setAdminLoginInput("");
    localStorage.setItem("onestep_session", JSON.stringify({ role: "admin" }));
    setMessage("管理者としてログインしました。");
  };

  const resetAdminPass = async () => {
    if (!adminResetInput.trim())
      return setMessage("新しい管理者パスコードを入力してください。");
    if (adminResetInput.trim() !== adminResetConfirmInput.trim())
      return setMessage("確認用の管理者パスコードが一致しません。");
    const code = adminResetInput.trim();
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "admin_passcode", value: code });
    if (error) return setMessage("保存に失敗しました。");
    setAdminPasscode(code);
    setAdminResetInput("");
    setAdminResetConfirmInput("");
    setShowAdminReset(false);
    setMessage(
      "管理者パスコードを再設定しました。会員データと記録はそのまま保持されています。"
    );
  };

  const loginMember = () => {
    const member = members.find(
      (m) =>
        m.name === memberLoginName.trim() &&
        m.passcode === memberLoginPasscode
    );
    if (!member)
      return setMessage("会員名または会員パスコードが一致しません。");
    setRole("member");
    setCurrentMemberName(member.name);
    setMemberLoginName("");
    setMemberLoginPasscode("");
    setEditingId(null);
    setForm(initialForm);
    setMessage(`${member.name}さんとしてログインしました。ご本人の記録のみ表示されます。`);
    const memberRecords = records.filter((r) => r.member_name === member.name);
    if (memberRecords.length > 0) {
      const last = memberRecords[memberRecords.length - 1];
      setForm((prev) => ({ ...prev, morning_weight: last.morning_weight || prev.morning_weight, night_weight: last.night_weight || prev.night_weight }));
    }
  };

  /* ---------- 会員管理 ---------- */
  const registerMember = async () => {
    const name = newMemberName.trim();
    const pass = newMemberPasscode.trim();
    if (!name || !pass)
      return setMessage("会員名と会員パスコードを入力してください。");
    if (members.some((m) => m.name === name))
      return setMessage("同じ会員名は登録できません。");

    const newMember = {
      name,
      passcode: pass,
      target_weight: newMemberTargetWeight.trim(),
    };
    const { data, error } = await supabase
      .from("members")
      .insert(newMember)
      .select()
      .single();
    if (error) return setMessage("会員登録に失敗しました。");

    setMembers((prev) => [
      ...prev,
      { id: data.id, name, passcode: pass, target_weight: newMember.target_weight },
    ]);
    setNewMemberName("");
    setNewMemberPasscode("");
    setNewMemberTargetWeight("");
    setSelectedMember(name);
    setMessage(`${name}さんを登録しました。`);
  };

  const saveTarget = async () => {
    if (!activeMember || selectedMember === "all")
      return setMessage("目標体重を設定する利用者を選択してください。");
    const { error } = await supabase
      .from("members")
      .update({ target_weight: targetWeightInput })
      .eq("name", activeMember.name);
    if (error) return setMessage("目標体重の保存に失敗しました。");

    setMembers((prev) =>
      prev.map((m) =>
        m.name === activeMember.name
          ? { ...m, target_weight: targetWeightInput }
          : m
      )
    );
    setMessage(`${activeMember.name}さんの目標体重を更新しました。`);
  };

  /* ---------- 記録の保存・編集・削除 ---------- */
  const saveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetName = role === "member" ? currentMemberName : selectedMember;
    if (!targetName || targetName === "all")
      return setMessage("記録する利用者を選択してください。");

    const current = editingId
      ? records.find((r) => r.id === editingId)
      : null;

    const payload = {
      member_name: targetName,
      date: form.date,
      morning_weight: form.morning_weight,
      night_weight: form.night_weight,
      breakfast: form.breakfast,
      lunch: form.lunch,
      dinner: form.dinner,
      reflection: form.reflection,
      admin_reply:
        role === "admin" ? form.admin_reply : current?.admin_reply || "",
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      // 更新
      const { error } = await supabase
        .from("records")
        .update(payload)
        .eq("id", editingId);
      if (error) return setMessage("更新に失敗しました。");

      setRecords((prev) =>
        prev
          .map((r) => (r.id === editingId ? { ...r, ...payload } : r))
          .sort((a, b) => a.date.localeCompare(b.date))
      );
    } else {
      const existing = records.find(
        (r) => r.member_name === targetName && r.date === form.date
      );
      if (existing) {
        const merged = {
          ...payload,
          morning_weight: payload.morning_weight || existing.morning_weight,
          night_weight: payload.night_weight || existing.night_weight,
          reflection: payload.reflection || existing.reflection,
          admin_reply: role === "admin" ? payload.admin_reply : existing.admin_reply,
        };
        const { error } = await supabase.from("records").update(merged).eq("id", existing.id);
        if (error) return setMessage("更新に失敗しました。");
        setRecords((prev) => prev.map((r) => (r.id === existing.id ? { ...r, ...merged } : r)).sort((a, b) => a.date.localeCompare(b.date)));
        setMessage("同日の記録を更新しました。");
      } else {
        const { data, error } = await supabase.from("records").insert(payload).select().single();
        if (error) return setMessage("保存に失敗しました。");
        const newRecord: RecordItem = { id: data.id, member_name: payload.member_name, date: payload.date, morning_weight: payload.morning_weight, night_weight: payload.night_weight, breakfast: payload.breakfast, lunch: payload.lunch, dinner: payload.dinner, reflection: payload.reflection, admin_reply: payload.admin_reply };
        setRecords((prev) => [...prev, newRecord].sort((a, b) => a.date.localeCompare(b.date)));
      }
    }

    setMessage("記録を保存しました。");
    resetForm();
  };

  const editRecord = (item: RecordItem) => {
    if (role === "admin") setSelectedMember(item.member_name);
    setEditingId(item.id);
    setForm({
      date: item.date,
      morning_weight: item.morning_weight,
      night_weight: item.night_weight,
      breakfast: item.breakfast,
      lunch: item.lunch,
      dinner: item.dinner,
      reflection: item.reflection,
      admin_reply: item.admin_reply,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteRecord = async (id: string) => {
    const { error } = await supabase.from("records").delete().eq("id", id);
    if (error) return setMessage("削除に失敗しました。");
    setRecords((prev) => prev.filter((r) => r.id !== id));
    if (editingId === id) resetForm();
    setMessage("記録を削除しました。");
  };

  /* ---------- 表示制御 ---------- */
  const showMemberNames = role === "admin";
  const allSelected = role === "admin" && selectedMember === "all";

  /* ---------- ローディング画面 ---------- */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-pulse rounded-3xl bg-gradient-to-br from-orange-400 to-sky-400" />
          <p className="text-sm text-slate-500">読み込み中…</p>
        </div>
      </div>
    );
  }

  /* ---------- ゲスト画面（ログイン） ---------- */
  if (role === "guest") {
    return (
      <div className="min-h-screen bg-slate-100 p-3 sm:p-4">
        <div className="mx-auto max-w-md space-y-3 md:max-w-3xl md:space-y-5">
          <Card className="rounded-[28px] border border-slate-100 bg-gradient-to-r from-orange-50 to-sky-50 shadow-sm">
            <CardContent className="p-6 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-400 to-sky-400 text-xl font-bold text-white">
                OS
              </div>
              <p className="text-sm font-semibold tracking-[0.18em] text-slate-500">
                ONE STEP HEALTH APP
              </p>
              <h1 className="mt-2 text-xl font-bold text-slate-800 md:text-3xl">
                One Step：体重管理
              </h1>
              <p className="mt-2 text-sm leading-7 text-slate-600">
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm">
            <CardContent className="p-6">
              {!adminPasscode ? (
                <div className="space-y-4">
                  <div className="rounded-2xl bg-orange-50 p-4 text-sm leading-6 text-slate-700">
                    最初のセットアップです。まず、あなただけが使う管理者パスコードを設定してください。
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminSetupInput">管理者パスコード</Label>
                    <Input
                      id="adminSetupInput"
                      type="password"
                      placeholder="管理者だけが知るパスコード"
                      value={adminSetupInput}
                      onChange={(e) => setAdminSetupInput(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    className="w-full rounded-2xl"
                    onClick={setupAdmin}
                  >
                    管理者パスコードを設定する
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                    <Button
                      type="button"
                      variant={tab === "member" ? "default" : "ghost"}
                      className="rounded-xl"
                      onClick={() => setTab("member")}
                    >
                      会員ログイン
                    </Button>
                    <Button
                      type="button"
                      variant={tab === "admin" ? "default" : "ghost"}
                      className="rounded-xl"
                      onClick={() => setTab("admin")}
                    >
                      管理者ログイン
                    </Button>
                  </div>

                  {tab === "member" ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="memberLoginName">会員名</Label>
                        <Input
                          id="memberLoginName"
                          type="text"
                          placeholder="登録済みの会員名"
                          value={memberLoginName}
                          onChange={(e) => setMemberLoginName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="memberLoginPasscode">
                          会員パスコード
                        </Label>
                        <Input
                          id="memberLoginPasscode"
                          type="password"
                          placeholder="会員専用パスコード"
                          value={memberLoginPasscode}
                          onChange={(e) =>
                            setMemberLoginPasscode(e.target.value)
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        className="w-full rounded-2xl"
                        onClick={loginMember}
                      >
                        会員としてログイン
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="adminLoginInput">
                          管理者パスコード
                        </Label>
                        <Input
                          id="adminLoginInput"
                          type="password"
                          placeholder="管理者パスコード"
                          value={adminLoginInput}
                          onChange={(e) => setAdminLoginInput(e.target.value)}
                        />
                      </div>
                      <Button
                        type="button"
                        className="w-full rounded-2xl"
                        onClick={loginAdmin}
                      >
                        管理者としてログイン
                      </Button>

                      <div className="rounded-2xl border border-dashed border-slate-200 p-4">
                        <div className="mb-3 text-sm font-semibold text-slate-700">
                          管理者パスコードを忘れた場合
                        </div>
                        <p className="mb-3 text-xs leading-6 text-slate-500">
                          保存データを残したまま、管理者パスコードだけ再設定できます。ただし、このURLにアクセスできる人なら使えるため、厳密なセキュリティ用途には向きません。
                        </p>
                        {!showAdminReset ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full rounded-2xl"
                            onClick={() => setShowAdminReset(true)}
                          >
                            管理者パスコードを再設定する
                          </Button>
                        ) : (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <Label htmlFor="adminResetInput">
                                新しい管理者パスコード
                              </Label>
                              <Input
                                id="adminResetInput"
                                type="password"
                                placeholder="新しい管理者パスコード"
                                value={adminResetInput}
                                onChange={(e) =>
                                  setAdminResetInput(e.target.value)
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="adminResetConfirmInput">
                                確認用パスコード
                              </Label>
                              <Input
                                id="adminResetConfirmInput"
                                type="password"
                                placeholder="もう一度入力"
                                value={adminResetConfirmInput}
                                onChange={(e) =>
                                  setAdminResetConfirmInput(e.target.value)
                                }
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                className="flex-1 rounded-2xl"
                                onClick={resetAdminPass}
                              >
                                保存する
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-2xl"
                                onClick={() => {
                                  setShowAdminReset(false);
                                  setAdminResetInput("");
                                  setAdminResetConfirmInput("");
                                }}
                              >
                                キャンセル
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {message && (
                <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                  {message}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  /* ---------- メイン画面（会員 / 管理者） ---------- */
  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-4">
      <div className="mx-auto max-w-md space-y-3 md:max-w-6xl md:space-y-5">
        {/* ヘッダー */}
        <Card className="rounded-[28px] border border-slate-100 bg-gradient-to-r from-orange-50 to-sky-50 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between md:p-6">
            <div>
              <div className="text-sm font-semibold tracking-[0.18em] text-slate-500">
                ONE STEP HEALTH APP
              </div>
              <h1 className="mt-1 text-xl font-bold text-slate-800 md:text-3xl">
                One Step：体重管理
              </h1>
            </div>
            <Button
              type="button"
              variant="outline"
              className="self-start rounded-2xl md:self-auto"
              onClick={logout}
            >
              ログアウト
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {/* ---- 左カラム ---- */}
          <div className="space-y-3 lg:col-span-1">
            {/* 利用者管理（管理者のみ） */}
            {role === "admin" && (
              <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle>利用者管理</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="memberFilter">表示する利用者</Label>
                    <Select
                      value={selectedMember || ""}
                      onValueChange={setSelectedMember}
                    >
                      <SelectTrigger id="memberFilter" className="rounded-2xl">
                        <SelectValue placeholder="利用者を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全員</SelectItem>
                        {sortedMembers.map((member) => (
                          <SelectItem key={member.name} value={member.name}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                    この選択欄は管理者だけに表示されます。会員ログインでは本人データしか表示されません。
                  </div>

                  <div className="space-y-3 rounded-3xl border border-slate-100 p-4">
                    <div className="text-sm font-semibold text-slate-700">
                      会員を新規登録
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newMemberName">会員名</Label>
                      <Input
                        id="newMemberName"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        placeholder="例：山田さん"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newMemberPasscode">会員パスコード</Label>
                      <Input
                        id="newMemberPasscode"
                        type="password"
                        value={newMemberPasscode}
                        onChange={(e) => setNewMemberPasscode(e.target.value)}
                        placeholder="会員専用パスコード"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newMemberTargetWeight">
                        目標体重 (kg)
                      </Label>
                      <Input
                        id="newMemberTargetWeight"
                        type="number"
                        step="0.1"
                        value={newMemberTargetWeight}
                        onChange={(e) =>
                          setNewMemberTargetWeight(e.target.value)
                        }
                        placeholder="例 60.0"
                      />
                    </div>
                    <Button
                      type="button"
                      className="w-full rounded-2xl"
                      onClick={registerMember}
                    >
                      会員を登録する
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 目標体重 */}
            <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle>目標体重</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {role === "admin" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="targetWeight">
                        選択中の利用者の目標体重 (kg)
                      </Label>
                      <Input
                        id="targetWeight"
                        type="number"
                        step="0.1"
                        placeholder="例 60.0"
                        value={targetWeightInput}
                        onChange={(e) => setTargetWeightInput(e.target.value)}
                        disabled={!activeMember || selectedMember === "all"}
                      />
                    </div>
                    <Button
                      type="button"
                      className="w-full rounded-2xl"
                      onClick={saveTarget}
                      disabled={!activeMember || selectedMember === "all"}
                    >
                      目標体重を保存する
                    </Button>
                  </>
                ) : (
                  <div className="rounded-2xl bg-orange-50 p-3 text-sm text-slate-700">
                    目標体重：
                    <span className="font-semibold">
                      {activeMember?.target_weight
                        ? `${activeMember.target_weight} kg`
                        : "未設定"}
                    </span>
                  </div>
                )}
                <div className="rounded-2xl bg-orange-50 p-3 text-sm text-slate-700">
                  グラフに目標体重の基準線を表示します。現在の朝・夜の体重との差も確認できます。
                </div>
              </CardContent>
            </Card>

            {/* 記録フォーム */}
            <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle>
                  {editingId ? "記録を編集" : "今日の記録を追加"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={saveRecord} className="space-y-4">
                  {role === "admin" && (
                    <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                      記録対象：
                      <span className="font-semibold">
                        {selectedMember && selectedMember !== "all"
                          ? selectedMember
                          : "利用者を選択してください"}
                      </span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="date">日付</Label>
                    <Input
                      id="date"
                      type="date"
                      value={form.date}
                      onChange={(e) => change("date", e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div><WeightPicker label="朝の体重" value={form.morning_weight || "56.0"} onChange={(v) => change("morning_weight", v)} /></div>
                    <div><WeightPicker label="夜の体重" value={form.night_weight || "56.0"} onChange={(v) => change("night_weight", v)} /></div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm font-medium text-slate-700">
                      食事量
                    </div>
                    <div className="grid gap-3">
                      <div className="space-y-2">
                        <Label>朝食</Label>
                        <Select
                          value={form.breakfast}
                          onValueChange={(value) => change("breakfast", value)}
                        >
                          <SelectTrigger className="rounded-2xl">
                            <SelectValue placeholder="選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {MEALS.map((m) => (
                              <SelectItem key={`b-${m.value}`} value={m.value}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>昼食</Label>
                        <Select
                          value={form.lunch}
                          onValueChange={(value) => change("lunch", value)}
                        >
                          <SelectTrigger className="rounded-2xl">
                            <SelectValue placeholder="選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {MEALS.map((m) => (
                              <SelectItem key={`l-${m.value}`} value={m.value}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>夕食</Label>
                        <Select
                          value={form.dinner}
                          onValueChange={(value) => change("dinner", value)}
                        >
                          <SelectTrigger className="rounded-2xl">
                            <SelectValue placeholder="選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {MEALS.map((m) => (
                              <SelectItem key={`d-${m.value}`} value={m.value}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reflection">反省コメント・気づき</Label>
                    <Textarea
                      id="reflection"
                      placeholder="例：夕食の量を調整できた。朝の体重が安定していた。"
                      value={form.reflection}
                      onChange={(e) => change("reflection", e.target.value)}
                      className="min-h-[96px] rounded-2xl"
                    />
                  </div>

                  {role === "admin" && (
                    <div className="space-y-2">
                      <Label htmlFor="admin_reply">
                        One Stepコメント返信
                      </Label>
                      <Textarea
                        id="admin_reply"
                        placeholder="ここは管理者だけが返信を入力できます。"
                        value={form.admin_reply}
                        onChange={(e) => change("admin_reply", e.target.value)}
                        className="min-h-[96px] rounded-2xl"
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                    <Button type="submit" className="flex-1 rounded-2xl">
                      {editingId ? "更新する" : "保存する"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-2xl"
                      onClick={resetForm}
                    >
                      クリア
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* ---- 右カラム（グラフ・統計） ---- */}
          <div className="space-y-3 lg:col-span-2">
            {allSelected ? (
              <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm">
                <CardContent className="p-6 text-sm leading-7 text-slate-600">
                  全員表示では一覧のみ確認できます。グラフや平均値を確認するときは、個別の利用者を選択してください。
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <StatCard
                    title="最新の朝体重"
                    value={latest ? fmtWeight(latest.morning_weight) : "-"}
                  />
                  <StatCard
                    title="最新の夜体重"
                    value={latest ? fmtWeight(latest.night_weight) : "-"}
                  />
                  <StatCard
                    title="7日平均（朝／夜）"
                    value={
                      <>
                        {morning7 !== null ? `${morning7} kg` : "-"}
                        <span className="mx-2 text-slate-400">／</span>
                        {night7 !== null ? `${night7} kg` : "-"}
                      </>
                    }
                  />
                  <StatCard
                    title="30日平均（朝／夜）"
                    value={
                      <>
                        {morning30 !== null ? `${morning30} kg` : "-"}
                        <span className="mx-2 text-slate-400">／</span>
                        {night30 !== null ? `${night30} kg` : "-"}
                      </>
                    }
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <StatCard
                    title="前日比（朝／夜）"
                    value={
                      <>
                        {morningDiff !== null ? `${morningDiff} kg` : "-"}
                        <span className="mx-2 text-slate-400">／</span>
                        {nightDiff !== null ? `${nightDiff} kg` : "-"}
                      </>
                    }
                  />
                  <StatCard
                    title="目標との差（朝／夜）"
                    value={
                      <>
                        {morningGap !== null ? `${morningGap} kg` : "-"}
                        <span className="mx-2 text-slate-400">／</span>
                        {nightGap !== null ? `${nightGap} kg` : "-"}
                      </>
                    }
                  />
                </div>

                <WeightChartCard
                  title="全体グラフ"
                  data={overallChartData}
                  targetWeight={activeMember?.target_weight}
                />

                {recentMonthKeys.map((monthKey) => (
                  <WeightChartCard
                    key={monthKey}
                    title={formatMonthLabel(monthKey)}
                    data={toChartData(monthGroups[monthKey] || [])}
                    targetWeight={activeMember?.target_weight}
                  />
                ))}

                {archivedMonthKeys.length > 0 && (
                  <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm">
                    <CardHeader>
                      <CardTitle>月別グラフを検索</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="monthSearch">
                          3か月より前の月を表示
                        </Label>
                        <Select
                          value={searchedMonthKey || ""}
                          onValueChange={setSearchedMonthKey}
                        >
                          <SelectTrigger
                            id="monthSearch"
                            className="rounded-2xl"
                          >
                            <SelectValue placeholder="月を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {archivedMonthKeys.map((monthKey) => (
                              <SelectItem key={monthKey} value={monthKey}>
                                {formatMonthSearchLabel(monthKey)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {searchedMonthKey && searchedMonthData.length > 0 && (
                  <WeightChartCard
                    title={formatMonthLabel(searchedMonthKey)}
                    data={searchedMonthData}
                    targetWeight={activeMember?.target_weight}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* ---- 記録一覧テーブル ---- */}
        <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>記録一覧</CardTitle>
          </CardHeader>
          <CardContent>
            {visibleRecords.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                まだ記録がありません。最初の1件を追加してください。
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="min-w-[860px] w-full text-xs sm:text-sm">
                  <thead className="bg-slate-50">
                    <tr className="border-b text-left text-slate-500">
                      {showMemberNames && (
                        <th className="px-3 py-3 font-medium">利用者名</th>
                      )}
                      <th className="px-3 py-3 font-medium">日付</th>
                      <th className="px-3 py-3 font-medium">朝</th>
                      <th className="px-3 py-3 font-medium">夜</th>
                      <th className="px-3 py-3 font-medium">朝食</th>
                      <th className="px-3 py-3 font-medium">昼食</th>
                      <th className="px-3 py-3 font-medium">夕食</th>
                      <th className="px-3 py-3 font-medium">
                        反省コメント・気づき
                      </th>
                      <th className="px-3 py-3 font-medium">
                        One Stepコメント返信
                      </th>
                      <th className="px-3 py-3 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRecords
                      .slice()
                      .reverse()
                      .map((item) => (
                        <tr
                          key={item.id}
                          className="border-b align-top text-slate-700 last:border-b-0"
                        >
                          {showMemberNames && (
                            <td className="whitespace-nowrap px-3 py-3 font-medium">
                              {item.member_name}
                            </td>
                          )}
                          <td className="whitespace-nowrap px-3 py-3">
                            {formatShortDate(item.date)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 font-medium">
                            {fmtWeight(item.morning_weight)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 font-medium">
                            {fmtWeight(item.night_weight)}
                          </td>
                          <td className="px-3 py-3">
                            <MealBadge value={item.breakfast} />
                          </td>
                          <td className="px-3 py-3">
                            <MealBadge value={item.lunch} />
                          </td>
                          <td className="px-3 py-3">
                            <MealBadge value={item.dinner} />
                          </td>
                          <td className="min-w-[220px] whitespace-pre-wrap px-3 py-3 leading-6">
                            {item.reflection || "-"}
                          </td>
                          <td className="min-w-[220px] whitespace-pre-wrap px-3 py-3 leading-6">
                            {item.admin_reply || "-"}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl"
                                onClick={() => editRecord(item)}
                              >
                                編集
                              </Button>
                              {role === "admin" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-xl"
                                  onClick={() => deleteRecord(item.id)}
                                >
                                  削除
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {message && (
              <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                {message}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
