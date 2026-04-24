#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "psycopg2-binary",
# ]
# ///
"""
Seed users from users.json into the API.
Registers each user via POST /auth/register, then promotes AGENT users
directly in the database (the API only creates CLIENT accounts).

Public API URL resolution (first match):
  1. SEED_API_BASE_URL — explicit override
  2. APP_PORT — http://localhost or http://localhost:<port> (Docker edge nginx)
  3. API_BASE_URL — e.g. http://localhost:8080 when API runs with bootRun (no proxy)
  4. http://localhost — default (nginx on host port 80)

PostgreSQL (for promoting agents): POSTGRES_HOST (default localhost), POSTGRES_PORT.
The stack publishes Postgres on the host; start it first (see README §5), e.g.:
  docker compose -f ./docker-compose.yml up -d

Usage:
    uv run seed_users.py
"""

import json
import urllib.request
import urllib.error
import psycopg2
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
ENV_FILE = SCRIPT_DIR.parent / ".env"
USERS_FILE = SCRIPT_DIR / "users.json"


def load_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            key, _, value = line.partition("=")
            env[key.strip()] = value.strip()
    return env


def resolve_api_base_url(env: dict[str, str]) -> str:
    """HTTP origin for /auth/register (through edge nginx in Docker, or direct API)."""
    v = env.get("SEED_API_BASE_URL", "").strip()
    if v:
        return v.rstrip("/")

    app_port = env.get("APP_PORT", "").strip()
    if app_port:
        return "http://localhost" if app_port == "80" else f"http://localhost:{app_port}"

    v = env.get("API_BASE_URL", "").strip()
    if v:
        return v.rstrip("/")

    return "http://localhost"


def register_user(api_url: str, user: dict) -> None:
    payload = json.dumps({
        "username": user["username"],
        "email": user["email"],
        "password": user["password"],
    }).encode()

    req = urllib.request.Request(
        f"{api_url}/auth/register",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req) as resp:
            print(f"  [ok]      {user['username']} ({resp.status})")
    except urllib.error.HTTPError as e:
        if e.code == 409:
            print(f"  [skip]    {user['username']} — already exists")
        else:
            body = e.read().decode(errors="replace")
            print(f"  [error]   {user['username']} — HTTP {e.code}: {body}")


def promote_agents(env: dict, agents: list[dict]) -> None:
    if not agents:
        return

    try:
        conn = psycopg2.connect(
            host=env.get("POSTGRES_HOST", "localhost"),
            port=int(env.get("POSTGRES_PORT", "5432")),
            dbname=env["POSTGRES_DB"],
            user=env["POSTGRES_USER"],
            password=env["POSTGRES_PASSWORD"],
        )
    except psycopg2.OperationalError as e:
        names = ", ".join(a["username"] for a in agents)
        print(f"\n  [warn]    Cannot connect to PostgreSQL ({e}). Agent promotion skipped.")
        print("            Start the stack so Postgres is up (localhost, POSTGRES_PORT in .env), then re-run.")
        print(
            "              docker compose -f ./docker-compose.yml up -d"
        )
        print("            (See README §5.) Or set POSTGRES_HOST. Agents: " + names)
        return

    try:
        with conn, conn.cursor() as cur:
            for agent in agents:
                cur.execute(
                    "UPDATE users SET role = 'AGENT' WHERE username = %s",
                    (agent["username"],),
                )
                if cur.rowcount == 0:
                    print(f"  [warn]    {agent['username']} — not found in DB, role not updated")
                else:
                    print(f"  [promoted] {agent['username']} → AGENT")
    finally:
        conn.close()


def main() -> None:
    if not ENV_FILE.exists():
        raise FileNotFoundError(f".env not found at {ENV_FILE}")

    env = load_env(ENV_FILE)
    api_url = resolve_api_base_url(env)

    with open(USERS_FILE) as f:
        users: list[dict] = json.load(f)

    print(f"Registering {len(users)} users against {api_url} …")
    for user in users:
        register_user(api_url, user)

    agents = [u for u in users if u.get("role") == "AGENT"]
    if agents:
        print(f"\nPromoting {len(agents)} agent(s) in the database …")
        promote_agents(env, agents)

    print("\nDone.")


if __name__ == "__main__":
    main()
