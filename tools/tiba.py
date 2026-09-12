#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Mount colophons from the shared stream onto the scroll itself.

    python3 tools/tiba.py open --api https://ccp-tiba.workers.dev --owner-key K
    python3 tools/tiba.py list --api https://ccp-tiba.workers.dev --pass P
    python3 tools/tiba.py take --api ... --pass P --owner-key K ID ID
    python3 tools/tiba.py take --from export.json ID ID

The stream is a conversation; assets/data/tiba-<slug>.js is the mounted
colophon. Crossing between them should be deliberate and reviewable, so this
takes the ids you name and nothing else, and writes a file you then commit.

Whoever signed a colophon is carried across with it. Anonymous mounting is how
a comment board happens by accident, so an unsigned record is refused and the
rest still go.
"""
import argparse, base64, json, re, secrets, sys, urllib.error, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "assets" / "data"

HDR = ("/* Colophons mounted on the scroll. A 題跋 is someone's hand added to the\n"
       "   painting, signed, in the margin or on the tail. Taken from the shared\n"
       "   stream by tools/tiba.py; the writer's name travels with the text. */\n")

KEEP = ("id", "slug", "at", "by", "text", "spot")


def mint_pass():
    return base64.urlsafe_b64encode(secrets.token_bytes(16)).rstrip(b"=").decode()


def call(api, path, body=None, owner_key=None):
    """Returns (status, parsed json). A worker error is a normal answer here."""
    url = api.rstrip("/") + path
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method="POST" if data else "GET")
    if data:
        req.add_header("Content-Type", "application/json")
    if owner_key:
        req.add_header("Authorization", "Bearer " + owner_key)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except ValueError:
            return e.code, {"error": raw[:200]}


def read_file(path):
    """The committed file is JS, so read the one object literal out of it."""
    raw = path.read_text(encoding="utf-8")
    i = raw.index("window.TIBA")
    return json.loads(raw[raw.index("{", i): raw.rindex("}") + 1])


def mounted_ids(data_dir):
    ids = set()
    for p in sorted(Path(data_dir).glob("tiba-*.js")):
        for it in read_file(p).get("items", []):
            ids.add(str(it.get("id")))
    return ids


def trim(rec):
    out = {k: rec[k] for k in KEEP if k in rec and k != "spot"}
    s = rec.get("spot")
    if isinstance(s, dict) and "x" in s and "y" in s:
        out["spot"] = {"x": int(s["x"]), "y": int(s["y"])}
        if s.get("w") and s.get("h"):
            out["spot"]["w"] = int(s["w"]); out["spot"]["h"] = int(s["h"])
    return out


def fetch_items(a):
    if a.source:
        doc = json.loads(Path(a.source).read_text(encoding="utf-8"))
        return doc.get("items") or []
    if not (a.api and a.password):
        sys.exit("need --api and --pass, or --from export.json")
    status, doc = call(a.api, "/t/" + a.password)
    if status != 200:
        sys.exit("%s: %s" % (status, doc.get("error", "?")))
    return doc.get("items") or []


def cmd_open(a):
    p = mint_pass()
    status, doc = call(a.api, "/t/" + p, {"op": "open"}, a.owner_key)
    if status not in (200, 201):
        sys.exit("%s: %s" % (status, doc.get("error", "?")))
    if status == 200:
        print("that pass already existed, which should not happen. try again.")
        return
    print("pass opened.\n")
    print("  invite link fragment:  ?p=<slug>#tiba=" + p)
    print("  paintings.js line:     window.TIBA_API = '%s';" % a.api.rstrip("/"))


def cmd_list(a):
    items = fetch_items(a)
    done = mounted_ids(a.data_dir)
    left = [i for i in items if str(i.get("id")) not in done]
    if not left:
        print("nothing shared that is not already mounted.")
        return
    by_slug = {}
    for it in left:
        by_slug.setdefault(it.get("slug", "?"), []).append(it)
    for slug in sorted(by_slug):
        rows = by_slug[slug]
        print("\n%s  (%d)" % (slug, len(rows)))
        for it in rows:
            spot = it.get("spot") or {}
            where = "(%s,%s)" % (spot.get("x"), spot.get("y")) if spot else "tail"
            text = " ".join(str(it.get("text", "")).split())
            who = str(it.get("by") or "").strip() or "-"
            print("   %-24s %-12s %-14s %s" % (it.get("id"), who, where, text[:52]))
    print("\ntake some: tiba.py take --api ... --pass ... <id> <id>")


def cmd_take(a):
    items = {str(i.get("id")): i for i in fetch_items(a)}
    data_dir = Path(a.data_dir)

    keep, refused, missing = [], [], []
    for wanted in a.ids:
        it = items.get(wanted)
        if it is None:
            missing.append(wanted)
        elif not str(it.get("by") or "").strip():
            refused.append(wanted)
        else:
            keep.append(it)

    for wanted in missing:
        print("  no such id: " + wanted)
    for wanted in refused:
        print("  unsigned, not mounted: " + wanted)

    by_slug = {}
    for it in keep:
        slug = it.get("slug") or "qianli"
        by_slug.setdefault(slug, []).append(it)

    written = []
    for slug in sorted(by_slug):
        path = data_dir / ("tiba-%s.js" % slug)
        existing = read_file(path).get("items", []) if path.exists() else []
        seen = {str(n.get("id")) for n in existing}
        added = 0
        for it in by_slug[slug]:
            if str(it.get("id")) in seen:
                print("  already mounted: " + str(it.get("id")))
                continue
            existing.append(trim(it))
            seen.add(str(it.get("id")))
            written.append(str(it.get("id")))
            added += 1
        if not added:
            continue
        out = {"v": 1, "slug": slug, "items": existing}
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            HDR + "window.TIBA = " + json.dumps(out, ensure_ascii=False, indent=2) + ";\n",
            encoding="utf-8")
        print("  %s: +%d -> %s  (%d total)" % (slug, added, path, len(existing)))

    if written and a.api and a.password and a.owner_key:
        for wanted in written:
            status, doc = call(a.api, "/t/" + a.password,
                               {"op": "withdraw", "id": wanted}, a.owner_key)
            if status != 200:
                print("  mounted but still in the stream: %s (%s %s)"
                      % (wanted, status, doc.get("error", "?")))

    print("\nreview the diff, then commit.")


common = argparse.ArgumentParser(add_help=False)
common.add_argument("--data-dir", default=str(DATA), help="where tiba-<slug>.js live")

ap = argparse.ArgumentParser(description="題跋: open a stream, list it, mount from it.")
sub = ap.add_subparsers(dest="cmd", required=True)

o = sub.add_parser("open", help="mint a pass and create its stream")
o.add_argument("--api", required=True)
o.add_argument("--owner-key", required=True)
o.set_defaults(fn=cmd_open)

l = sub.add_parser("list", parents=[common], help="what is shared and not yet mounted")
l.add_argument("--api")
l.add_argument("--pass", dest="password")
l.set_defaults(fn=cmd_list, source=None)

t = sub.add_parser("take", parents=[common], help="mount the ids you name")
t.add_argument("--api")
t.add_argument("--pass", dest="password")
t.add_argument("--owner-key")
t.add_argument("--from", dest="source", help="a browser export instead of the stream")
t.add_argument("ids", nargs="+")
t.set_defaults(fn=cmd_take)

a = ap.parse_args()
a.fn(a)
