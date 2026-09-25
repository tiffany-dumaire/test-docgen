"""
Diagrammes de suivi de projet, rendus en SVG (portable, net, sans dépendance).

Données (Project.tracking) :
  {
    "tasks": [{"id","name","start","end","progress"(0-100),
               "planned_end","deps":[id],"team","status"}],
    "milestones": [{"name","planned","actual"}],
    "risks": [{"name","probability"(1-5),"impact"(1-5),"status","action"}],
    "snapshots": [{"date","planned"(0-100),"actual"(0-100)}],
    "roadmap": [{"title","date"}]
  }

Types : gantt, planned_actual, progress_curve, dashboard, workload, roadmap,
        dependencies, burndown, burnup, risks, milestones.
"""
import datetime as _dt
import html as _html

W, H = 860, 470
PAL = ["#2563eb", "#22d3ee", "#8b5cf6", "#2dd4bf", "#f59e0b", "#ec4899",
       "#10b981", "#ef4444", "#6366f1", "#0ea5e9"]
STATUS_COLOR = {"done": "#10b981", "in_progress": "#2563eb",
                "late": "#ef4444", "planned": "#94a3b8"}
STATUS_LABEL = {"done": "Terminé", "in_progress": "En cours",
                "late": "En retard", "planned": "Planifié"}


def esc(t):
    return _html.escape(str(t))


def _d(s):
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return _dt.datetime.strptime(str(s)[:10], fmt).date()
        except Exception:
            pass
    return None


def _num(v, default=0.0):
    try:
        return float(v)
    except Exception:
        return default


def _svg(body, w=W, h=H, title=""):
    head = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
            f'viewBox="0 0 {w} {h}" font-family="Segoe UI, Roboto, sans-serif">'
            f'<rect width="{w}" height="{h}" fill="#ffffff"/>')
    if title:
        head += (f'<text x="{w/2}" y="28" text-anchor="middle" font-size="19" '
                 f'font-weight="700" fill="#16233b">{esc(title)}</text>')
    return (head + body + "</svg>").encode("utf-8")


def _date_range(tasks, extra=None):
    dates = []
    for t in tasks:
        for k in ("start", "end", "planned_end"):
            d = _d(t.get(k))
            if d:
                dates.append(d)
    for d in (extra or []):
        if d:
            dates.append(d)
    if not dates:
        today = _dt.date.today()
        return today, today + _dt.timedelta(days=30)
    return min(dates), max(dates)


def _empty(title, msg="Aucune donnée de suivi. Renseignez les tâches / jalons."):
    return _svg(f'<text x="{W/2}" y="{H/2}" text-anchor="middle" font-size="14" '
                f'fill="#94a3b8">{esc(msg)}</text>', title=title)


# --------------------------------------------------------------------------- #
def gantt(tr):
    tasks = tr.get("tasks") or []
    if not tasks:
        return _empty("Diagramme de Gantt")
    ms = tr.get("milestones") or []
    d0, d1 = _date_range(tasks, [_d(m.get("planned")) for m in ms])
    span = max(1, (d1 - d0).days)
    ml, mt, rowh = 210, 50, 26
    plot_w = W - ml - 30
    def x(d):
        dd = _d(d) or d0
        return ml + (dd - d0).days / span * plot_w
    body = []
    # grille temporelle (mois)
    cur = d0.replace(day=1)
    while cur <= d1:
        gx = x(cur)
        body.append(f'<line x1="{gx:.0f}" y1="{mt-6}" x2="{gx:.0f}" y2="{mt+len(tasks)*rowh}" stroke="#eef2f9"/>')
        body.append(f'<text x="{gx+2:.0f}" y="{mt-10}" font-size="10" fill="#94a3b8">{cur.strftime("%m/%y")}</text>')
        cur = (cur.replace(day=28) + _dt.timedelta(days=8)).replace(day=1)
    pos = {}
    for i, t in enumerate(tasks):
        y = mt + i * rowh
        pos[t.get("id", i)] = (y + rowh / 2, x(t.get("start")), x(t.get("end")))
        s, e = x(t.get("start")), x(t.get("end"))
        w = max(4, e - s)
        col = STATUS_COLOR.get(t.get("status"), "#2563eb")
        body.append(f'<text x="{ml-8}" y="{y+rowh/2+4:.0f}" text-anchor="end" font-size="11" fill="#334155">{esc(t.get("name",""))[:34]}</text>')
        body.append(f'<rect x="{s:.0f}" y="{y+5:.0f}" width="{w:.0f}" height="{rowh-12}" rx="4" fill="{col}" opacity="0.25"/>')
        pw = w * _num(t.get("progress")) / 100.0
        body.append(f'<rect x="{s:.0f}" y="{y+5:.0f}" width="{pw:.0f}" height="{rowh-12}" rx="4" fill="{col}"/>')
        body.append(f'<text x="{e+5:.0f}" y="{y+rowh/2+4:.0f}" font-size="10" fill="#64748b">{int(_num(t.get("progress")))}%</text>')
    # dépendances
    for t in tasks:
        for dep in (t.get("deps") or []):
            if dep in pos and t.get("id") in pos:
                y2, s2, _e2 = pos[t["id"]]
                y1, _s1, e1 = pos[dep]
                body.append(f'<path d="M{e1:.0f},{y1:.0f} C{e1+14:.0f},{y1:.0f} {s2-14:.0f},{y2:.0f} {s2:.0f},{y2:.0f}" stroke="#c084fc" fill="none" stroke-width="1.5"/>')
    # jalons
    for m in ms:
        d = _d(m.get("planned"))
        if not d:
            continue
        mx = x(d); my = mt + len(tasks) * rowh + 6
        body.append(f'<path d="M{mx:.0f},{my-6} l6,6 l-6,6 l-6,-6 z" fill="#f59e0b"/>')
        body.append(f'<text x="{mx:.0f}" y="{my+22:.0f}" text-anchor="middle" font-size="9" fill="#92400e">{esc(m.get("name",""))[:14]}</text>')
    return _svg("".join(body), h=mt + len(tasks) * rowh + 44, title="Diagramme de Gantt")


def planned_actual(tr):
    tasks = tr.get("tasks") or []
    if not tasks:
        return _empty("Planning prévu vs réalisé")
    ml, mt, rowh = 210, 50, 30
    plot_w = W - ml - 60
    body = []
    for i, t in enumerate(tasks):
        y = mt + i * rowh
        planned = _num(t.get("planned_progress", 100 if t.get("status") == "done" else 60))
        actual = _num(t.get("progress"))
        body.append(f'<text x="{ml-8}" y="{y+rowh/2+4:.0f}" text-anchor="end" font-size="11" fill="#334155">{esc(t.get("name",""))[:34]}</text>')
        body.append(f'<rect x="{ml}" y="{y+3:.0f}" width="{plot_w*planned/100:.0f}" height="9" rx="3" fill="#94a3b8"/>')
        body.append(f'<rect x="{ml}" y="{y+15:.0f}" width="{plot_w*actual/100:.0f}" height="9" rx="3" fill="#2563eb"/>')
        body.append(f'<text x="{ml+plot_w+6}" y="{y+rowh/2+4:.0f}" font-size="10" fill="#64748b">{int(actual)}%</text>')
    body.append(f'<rect x="{ml}" y="{mt+len(tasks)*rowh+6}" width="12" height="9" fill="#94a3b8"/><text x="{ml+18}" y="{mt+len(tasks)*rowh+14}" font-size="11" fill="#334155">Prévu</text>')
    body.append(f'<rect x="{ml+90}" y="{mt+len(tasks)*rowh+6}" width="12" height="9" fill="#2563eb"/><text x="{ml+108}" y="{mt+len(tasks)*rowh+14}" font-size="11" fill="#334155">Réalisé</text>')
    return _svg("".join(body), h=mt + len(tasks) * rowh + 30, title="Planning — prévu vs réalisé")


def _series_from_snapshots(tr):
    snaps = sorted(tr.get("snapshots") or [], key=lambda s: str(s.get("date")))
    return snaps


def progress_curve(tr):
    snaps = _series_from_snapshots(tr)
    if not snaps:
        return _empty("Courbe d'avancement")
    ml, mr, mt, mb = 55, 30, 50, 50
    pw, ph = W - ml - mr, H - mt - mb
    n = len(snaps)
    def px(i): return ml + (i / max(1, n - 1)) * pw
    def py(v): return mt + ph - (v / 100.0) * ph
    body = [f'<line x1="{ml}" y1="{mt+ph}" x2="{ml+pw}" y2="{mt+ph}" stroke="#cbd5e1"/>',
            f'<line x1="{ml}" y1="{mt}" x2="{ml}" y2="{mt+ph}" stroke="#cbd5e1"/>']
    for g in (0, 25, 50, 75, 100):
        gy = py(g)
        body.append(f'<line x1="{ml}" y1="{gy:.0f}" x2="{ml+pw}" y2="{gy:.0f}" stroke="#eef2f9"/>')
        body.append(f'<text x="{ml-6}" y="{gy+3:.0f}" text-anchor="end" font-size="9" fill="#94a3b8">{g}%</text>')
    for key, col in (("planned", "#94a3b8"), ("actual", "#2563eb")):
        pts = " ".join(f"{'M' if i==0 else 'L'}{px(i):.0f},{py(_num(s.get(key))):.0f}" for i, s in enumerate(snaps))
        body.append(f'<path d="{pts}" fill="none" stroke="{col}" stroke-width="2.5"/>')
    for i, s in enumerate(snaps):
        body.append(f'<circle cx="{px(i):.0f}" cy="{py(_num(s.get("actual"))):.0f}" r="3.5" fill="#2563eb"/>')
        body.append(f'<text x="{px(i):.0f}" y="{mt+ph+16:.0f}" text-anchor="middle" font-size="9" fill="#64748b">{esc(str(s.get("date",""))[5:])}</text>')
    body.append(f'<text x="{ml+pw-70}" y="{mt+8}" font-size="11" fill="#94a3b8">— prévu</text>')
    body.append(f'<text x="{ml+pw-70}" y="{mt+24}" font-size="11" fill="#2563eb">— réalisé</text>')
    return _svg("".join(body), title="Courbe d'avancement")


def dashboard(tr):
    tasks = tr.get("tasks") or []
    done = sum(1 for t in tasks if t.get("status") == "done")
    inprog = sum(1 for t in tasks if t.get("status") == "in_progress")
    late = sum(1 for t in tasks if t.get("status") == "late")
    total = len(tasks) or 1
    avg = sum(_num(t.get("progress")) for t in tasks) / total if tasks else 0
    body = []
    # jauge d'avancement
    cx, cy, r = 150, 160, 78
    import math
    frac = avg / 100.0
    body.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="#e2e8f0" stroke-width="16"/>')
    a0 = -math.pi / 2
    a1 = a0 + frac * 2 * math.pi
    large = 1 if frac > 0.5 else 0
    x0, y0 = cx + r * math.cos(a0), cy + r * math.sin(a0)
    x1, y1 = cx + r * math.cos(a1), cy + r * math.sin(a1)
    body.append(f'<path d="M{x0:.0f},{y0:.0f} A{r},{r} 0 {large} 1 {x1:.1f},{y1:.1f}" fill="none" stroke="#2563eb" stroke-width="16" stroke-linecap="round"/>')
    body.append(f'<text x="{cx}" y="{cy+2}" text-anchor="middle" font-size="34" font-weight="800" fill="#16233b">{int(round(avg))}%</text>')
    body.append(f'<text x="{cx}" y="{cy+26}" text-anchor="middle" font-size="12" fill="#64748b">avancement global</text>')
    cards = [("Tâches", total, "#6366f1"), ("Terminées", done, "#10b981"),
             ("En cours", inprog, "#2563eb"), ("En retard", late, "#ef4444")]
    bx, by = 300, 70
    for i, (lbl, val, col) in enumerate(cards):
        cxx = bx + (i % 2) * 270
        cyy = by + (i // 2) * 110
        body.append(f'<rect x="{cxx}" y="{cyy}" width="250" height="92" rx="14" fill="#f8fafc" stroke="#e2e8f0"/>')
        body.append(f'<rect x="{cxx}" y="{cyy}" width="6" height="92" rx="3" fill="{col}"/>')
        body.append(f'<text x="{cxx+22}" y="{cyy+48}" font-size="34" font-weight="800" fill="{col}">{val}</text>')
        body.append(f'<text x="{cxx+22}" y="{cyy+72}" font-size="13" fill="#64748b">{esc(lbl)}</text>')
    return _svg("".join(body), title="Tableau de bord projet")


def workload(tr):
    tasks = tr.get("tasks") or []
    load = {}
    for t in tasks:
        s, e = _d(t.get("start")), _d(t.get("end"))
        days = (e - s).days + 1 if s and e and e >= s else 1
        team = t.get("team") or "Non affecté"
        load[team] = load.get(team, 0) + days
    if not load:
        return _empty("Diagramme de charge")
    items = sorted(load.items(), key=lambda kv: -kv[1])
    ml, mt, mb, mr = 150, 50, 40, 40
    pw, ph = W - ml - mr, H - mt - mb
    vmax = max(v for _, v in items) or 1
    n = len(items); gap = ph / n; bh = gap * 0.6
    body = []
    for i, (team, v) in enumerate(items):
        y = mt + i * gap + (gap - bh) / 2
        bw = v / vmax * pw
        body.append(f'<text x="{ml-8}" y="{y+bh/2+4:.0f}" text-anchor="end" font-size="11" fill="#334155">{esc(team)[:22]}</text>')
        body.append(f'<rect x="{ml}" y="{y:.0f}" width="{bw:.0f}" height="{bh:.0f}" rx="4" fill="{PAL[i%len(PAL)]}"/>')
        body.append(f'<text x="{ml+bw+6:.0f}" y="{y+bh/2+4:.0f}" font-size="11" fill="#64748b">{int(v)} j</text>')
    return _svg("".join(body), title="Diagramme de charge (jours · équipe)")


def roadmap(tr):
    steps = tr.get("roadmap") or [{"title": m.get("name"), "date": m.get("planned")}
                                  for m in (tr.get("milestones") or [])]
    steps = [s for s in steps if s.get("title")]
    if not steps:
        return _empty("Roadmap")
    steps = sorted(steps, key=lambda s: str(s.get("date") or ""))
    y = 150
    ml, mr = 60, 60
    pw = W - ml - mr
    n = len(steps)
    body = [f'<line x1="{ml}" y1="{y}" x2="{ml+pw}" y2="{y}" stroke="#c7d2fe" stroke-width="4"/>']
    for i, s in enumerate(steps):
        x = ml + (i + 0.5) / n * pw
        col = PAL[i % len(PAL)]
        up = i % 2 == 0
        ty = y - 30 if up else y + 30
        body.append(f'<circle cx="{x:.0f}" cy="{y}" r="9" fill="{col}"/>')
        body.append(f'<line x1="{x:.0f}" y1="{y}" x2="{x:.0f}" y2="{ty}" stroke="{col}" stroke-width="2"/>')
        body.append(f'<rect x="{x-70:.0f}" y="{ty-24 if up else ty:.0f}" width="140" height="46" rx="10" fill="#f8fafc" stroke="{col}"/>')
        body.append(f'<text x="{x:.0f}" y="{(ty-6 if up else ty+16):.0f}" text-anchor="middle" font-size="11" font-weight="700" fill="#16233b">{esc(s.get("title",""))[:20]}</text>')
        body.append(f'<text x="{x:.0f}" y="{(ty+8 if up else ty+32):.0f}" text-anchor="middle" font-size="9" fill="#64748b">{esc(str(s.get("date","")))}</text>')
    return _svg("".join(body), title="Roadmap")


def dependencies(tr):
    tasks = tr.get("tasks") or []
    if not tasks:
        return _empty("Diagramme des dépendances")
    # niveaux par longest-path
    by_id = {t.get("id"): t for t in tasks}
    level = {}
    def depth(tid, seen=()):
        if tid in level:
            return level[tid]
        if tid in seen:
            return 0
        deps = by_id.get(tid, {}).get("deps") or []
        d = 0 if not deps else 1 + max((depth(x, seen + (tid,)) for x in deps if x in by_id), default=-1) + 0
        level[tid] = d
        return d
    for t in tasks:
        depth(t.get("id"))
    cols = {}
    for t in tasks:
        cols.setdefault(level.get(t.get("id"), 0), []).append(t)
    maxlvl = max(cols) if cols else 0
    ml, mt = 60, 60
    colw = (W - 2 * ml) / (maxlvl + 1)
    pos = {}
    body = []
    for lv, ts in cols.items():
        for j, t in enumerate(ts):
            cx = ml + lv * colw
            cy = mt + j * 70 + 20
            pos[t.get("id")] = (cx, cy)
    # arêtes
    for t in tasks:
        if t.get("id") in pos:
            x2, y2 = pos[t["id"]]
            for dep in (t.get("deps") or []):
                if dep in pos:
                    x1, y1 = pos[dep]
                    body.append(f'<path d="M{x1+70:.0f},{y1:.0f} C{x1+110:.0f},{y1:.0f} {x2-40:.0f},{y2:.0f} {x2:.0f},{y2:.0f}" stroke="#a78bfa" fill="none" stroke-width="1.6" marker-end="url(#ar)"/>')
    for t in tasks:
        x, y = pos[t.get("id")]
        col = STATUS_COLOR.get(t.get("status"), "#2563eb")
        body.append(f'<rect x="{x:.0f}" y="{y-18:.0f}" width="150" height="36" rx="9" fill="#fff" stroke="{col}" stroke-width="2"/>')
        body.append(f'<text x="{x+75:.0f}" y="{y+4:.0f}" text-anchor="middle" font-size="10" fill="#16233b">{esc(t.get("name",""))[:20]}</text>')
    defs = '<defs><marker id="ar" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 z" fill="#a78bfa"/></marker></defs>'
    h = mt + max((len(v) for v in cols.values()), default=1) * 70 + 30
    return _svg(defs + "".join(body), h=max(H, h), title="Diagramme des dépendances")


def burndown(tr, up=False):
    snaps = _series_from_snapshots(tr)
    if not snaps:
        return _empty("Burnup" if up else "Burndown")
    ml, mr, mt, mb = 55, 30, 50, 50
    pw, ph = W - ml - mr, H - mt - mb
    n = len(snaps)
    def px(i): return ml + (i / max(1, n - 1)) * pw
    def py(v): return mt + ph - (v / 100.0) * ph
    body = [f'<line x1="{ml}" y1="{mt+ph}" x2="{ml+pw}" y2="{mt+ph}" stroke="#cbd5e1"/>',
            f'<line x1="{ml}" y1="{mt}" x2="{ml}" y2="{mt+ph}" stroke="#cbd5e1"/>']
    # idéale
    body.append(f'<line x1="{px(0):.0f}" y1="{py(0 if up else 100):.0f}" x2="{px(n-1):.0f}" y2="{py(100 if up else 0):.0f}" stroke="#cbd5e1" stroke-dasharray="5,4"/>')
    vals = [(_num(s.get("actual")) if up else 100 - _num(s.get("actual"))) for s in snaps]
    pts = " ".join(f"{'M' if i==0 else 'L'}{px(i):.0f},{py(v):.0f}" for i, v in enumerate(vals))
    col = "#10b981" if up else "#ef4444"
    body.append(f'<path d="{pts}" fill="none" stroke="{col}" stroke-width="2.5"/>')
    for i, v in enumerate(vals):
        body.append(f'<circle cx="{px(i):.0f}" cy="{py(v):.0f}" r="3.5" fill="{col}"/>')
        body.append(f'<text x="{px(i):.0f}" y="{mt+ph+16:.0f}" text-anchor="middle" font-size="9" fill="#64748b">{esc(str(s if False else snaps[i].get("date",""))[5:])}</text>')
    return _svg("".join(body), title="Burnup chart" if up else "Burndown chart")


def burnup(tr):
    return burndown(tr, up=True)


def risks(tr):
    rs = tr.get("risks") or []
    if not rs:
        return _empty("Suivi des risques")
    ml, mt = 70, 50
    grid = 62
    body = []
    # matrice 5x5 probabilité (y) x impact (x)
    for i in range(5):
        for j in range(5):
            sev = (i + 1) * (j + 1)
            col = "#dcfce7" if sev <= 6 else ("#fef9c3" if sev <= 12 else "#fee2e2")
            x = ml + j * grid; y = mt + (4 - i) * grid
            body.append(f'<rect x="{x}" y="{y}" width="{grid}" height="{grid}" fill="{col}" stroke="#fff"/>')
    body.append(f'<text x="{ml+2.5*grid}" y="{mt+5*grid+28}" text-anchor="middle" font-size="12" fill="#334155">Impact →</text>')
    body.append(f'<text x="{ml-30}" y="{mt+2.5*grid}" text-anchor="middle" font-size="12" fill="#334155" transform="rotate(-90 {ml-30} {mt+2.5*grid})">Probabilité →</text>')
    for k, r in enumerate(rs):
        p = min(5, max(1, int(_num(r.get("probability", 3)))))
        im = min(5, max(1, int(_num(r.get("impact", 3)))))
        x = ml + (im - 1) * grid + grid / 2
        y = mt + (5 - p) * grid + grid / 2
        col = PAL[k % len(PAL)]
        body.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="13" fill="{col}" opacity="0.85"/>')
        body.append(f'<text x="{x:.0f}" y="{y+4:.0f}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">R{k+1}</text>')
    # légende
    ly = mt
    for k, r in enumerate(rs[:8]):
        body.append(f'<circle cx="{ml+5*grid+30}" cy="{ly+8+k*22}" r="7" fill="{PAL[k%len(PAL)]}"/>')
        body.append(f'<text x="{ml+5*grid+42}" y="{ly+12+k*22}" font-size="10" fill="#334155">R{k+1} — {esc(r.get("name",""))[:22]} ({esc(r.get("status","")) })</text>')
    return _svg("".join(body), title="Suivi des risques (probabilité × impact)")


def milestones(tr):
    ms = tr.get("milestones") or []
    if not ms:
        return _empty("Suivi des jalons")
    ml, mt, rowh = 30, 60, 34
    body = [f'<text x="{ml}" y="{mt-14}" font-size="11" fill="#94a3b8">Jalon</text>',
            f'<text x="360" y="{mt-14}" font-size="11" fill="#94a3b8">Prévu</text>',
            f'<text x="500" y="{mt-14}" font-size="11" fill="#94a3b8">Réel</text>',
            f'<text x="640" y="{mt-14}" font-size="11" fill="#94a3b8">Écart</text>']
    for i, m in enumerate(ms):
        y = mt + i * rowh
        pl, ac = _d(m.get("planned")), _d(m.get("actual"))
        delta = (ac - pl).days if pl and ac else None
        dcol = "#10b981" if (delta is not None and delta <= 0) else ("#ef4444" if delta else "#94a3b8")
        body.append(f'<line x1="{ml}" y1="{y+rowh-8}" x2="{W-30}" y2="{y+rowh-8}" stroke="#eef2f9"/>')
        body.append(f'<path d="M{ml+6},{y+8} l6,6 l-6,6 l-6,-6 z" fill="#f59e0b"/>')
        body.append(f'<text x="{ml+22}" y="{y+18}" font-size="12" fill="#16233b">{esc(m.get("name",""))[:40]}</text>')
        body.append(f'<text x="360" y="{y+18}" font-size="12" fill="#334155">{esc(m.get("planned","—"))}</text>')
        body.append(f'<text x="500" y="{y+18}" font-size="12" fill="#334155">{esc(m.get("actual") or "—")}</text>')
        body.append(f'<text x="640" y="{y+18}" font-size="12" font-weight="700" fill="{dcol}">{("+" if (delta or 0)>0 else "")+str(delta)+" j" if delta is not None else "—"}</text>')
    return _svg("".join(body), h=max(H, mt + len(ms) * rowh + 20), title="Suivi des jalons")


RENDERERS = {
    "gantt": gantt, "planned_actual": planned_actual,
    "progress_curve": progress_curve, "dashboard": dashboard,
    "workload": workload, "roadmap": roadmap, "dependencies": dependencies,
    "burndown": burndown, "burnup": burnup, "risks": risks,
    "milestones": milestones,
}

TYPES = [
    ("gantt", "Diagramme de Gantt"),
    ("planned_actual", "Planning prévu vs réalisé"),
    ("progress_curve", "Courbe d'avancement"),
    ("dashboard", "Tableau de bord projet"),
    ("workload", "Diagramme de charge"),
    ("roadmap", "Roadmap"),
    ("dependencies", "Diagramme des dépendances"),
    ("burndown", "Burndown chart"),
    ("burnup", "Burnup chart"),
    ("risks", "Suivi des risques"),
    ("milestones", "Suivi des jalons"),
]


def render(kind, tracking):
    fn = RENDERERS.get(kind)
    if not fn:
        return _empty("Diagramme", "Type de diagramme inconnu.")
    try:
        return fn(tracking or {})
    except Exception as exc:  # robustesse : ne casse jamais l'UI
        return _empty(kind, f"Erreur de rendu : {exc}")
