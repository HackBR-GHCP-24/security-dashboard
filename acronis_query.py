"""Consulta alertas (status de backup) por tenant nos datacenters Acronis br01 e br02.

Variaveis de ambiente (por datacenter):
  ACRONIS_BR01_CLIENT_ID / ACRONIS_BR01_CLIENT_SECRET
  ACRONIS_BR02_CLIENT_ID / ACRONIS_BR02_CLIENT_SECRET

Uso: python acronis_query.py [--dc br01 br02] [--json saida.json]
"""
import argparse
import json
import os
import sys
from collections import defaultdict

import requests

TIMEOUT = 30


def base_url(dc):
    return f"https://{dc}-cloud.acronis.com"


def get_token(dc):
    cid = os.environ.get(f"ACRONIS_{dc.upper()}_CLIENT_ID")
    secret = os.environ.get(f"ACRONIS_{dc.upper()}_CLIENT_SECRET")
    if not cid or not secret:
        raise RuntimeError(f"Credenciais ausentes para {dc}")
    r = requests.post(
        f"{base_url(dc)}/api/2/idp/token",
        auth=(cid, secret),
        data={"grant_type": "client_credentials"},
        timeout=TIMEOUT,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def paged(session, url, params=None):
    params = dict(params or {})
    while True:
        r = session.get(url, params=params, timeout=TIMEOUT)
        r.raise_for_status()
        data = r.json()
        yield from data.get("items", [])
        after = data.get("paging", {}).get("cursors", {}).get("after")
        if not after:
            return
        params["after"] = after


def tenant_names(session, dc, ids):
    names = {}
    ids = sorted(ids)
    for i in range(0, len(ids), 50):
        chunk = ids[i:i + 50]
        r = session.get(
            f"{base_url(dc)}/api/2/tenants",
            params={"uuids": ",".join(chunk)},
            timeout=TIMEOUT,
        )
        r.raise_for_status()
        for t in r.json().get("items", []):
            names[t["id"]] = t.get("name", t["id"])
    return names


def query_dc(dc):
    s = requests.Session()
    s.headers["Authorization"] = f"Bearer {get_token(dc)}"
    alerts = list(paged(s, f"{base_url(dc)}/api/alert_manager/v1/alerts", {"limit": 100}))
    names = tenant_names(s, dc, {a["tenant"]["id"] for a in alerts if a.get("tenant")})
    result = defaultdict(list)
    for a in alerts:
        tid = (a.get("tenant") or {}).get("id", "unknown")
        result[names.get(tid, tid)].append({
            "type": a.get("type"),
            "severity": a.get("severity"),
            "category": a.get("details", {}).get("category"),
            "resource": a.get("details", {}).get("resourceName"),
            "created_at": a.get("createdAt"),
        })
    return result


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--dc", nargs="+", default=["br01", "br02"])
    p.add_argument("--json")
    args = p.parse_args()

    out = {}
    for dc in args.dc:
        try:
            out[dc] = query_dc(dc)
        except Exception as e:
            print(f"[{dc}] erro: {e}", file=sys.stderr)
            out[dc] = {"error": str(e)}

    for dc, tenants in out.items():
        print(f"\n=== {dc.upper()} ===")
        if "error" in tenants:
            print(f"  erro: {tenants['error']}")
            continue
        if not tenants:
            print("  sem alertas")
        for name, items in sorted(tenants.items()):
            print(f"  {name}: {len(items)} alerta(s)")
            for a in items:
                print(f"    - [{a['severity']}] {a['type']} | {a['resource']} | {a['created_at']}")

    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
