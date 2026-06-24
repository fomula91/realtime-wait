#!/usr/bin/env python3
"""
SessionEnd hook — 세션이 끝나면 작업 내역을 위키 후보 영역에 자동 기록한다.

- 입력: stdin 으로 들어오는 SessionEnd hook JSON (transcript_path, session_id, cwd, reason)
- 출력: _Inbox/ClaudeCode/<날짜>-<프로젝트>-session.md 작성(후보. 사람이 검토 후 정식 반영)
- 원칙: 어떤 경우에도 세션 종료를 방해하지 않는다(항상 exit 0).
"""
import json
import sys
import os
from datetime import datetime

WIKI_INBOX = "/Users/wellbing/Desktop/LLM-WIKI/JACOB-LLM-WIKI/_Inbox/ClaudeCode"
EDIT_TOOLS = {"Edit", "Write", "MultiEdit", "NotebookEdit"}


def text_of(content):
    """message.content(문자열 또는 블록 배열)에서 사람이 읽을 텍스트만 추출."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for b in content:
            if isinstance(b, dict) and b.get("type") == "text":
                parts.append(b.get("text", ""))
        return "\n".join(parts)
    return ""


def is_real_prompt(t):
    """슬래시 명령·시스템 리마인더·도구 결과가 아닌 실제 사용자 프롬프트인지."""
    s = t.strip()
    if not s:
        return False
    head = s[:40]
    for marker in ("<command-", "<local-command", "<system-reminder", "<task-notification"):
        if marker in head:
            return False
    return True


def main():
    raw = sys.stdin.read()
    data = json.loads(raw) if raw.strip() else {}

    transcript_path = data.get("transcript_path", "")
    session_id = data.get("session_id", "")
    reason = data.get("reason", "")
    cwd = data.get("cwd", "") or os.getcwd()
    project = os.path.basename(cwd.rstrip("/")) or "session"

    prompts = []
    changed = []
    seen_files = set()

    if transcript_path and os.path.exists(transcript_path):
        with open(transcript_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                except json.JSONDecodeError:
                    continue
                msg = rec.get("message") or {}
                role = msg.get("role") or rec.get("type")
                content = msg.get("content")
                if role == "user":
                    t = text_of(content)
                    if is_real_prompt(t):
                        prompts.append(t.strip())
                elif role == "assistant" and isinstance(content, list):
                    for b in content:
                        if not isinstance(b, dict) or b.get("type") != "tool_use":
                            continue
                        if b.get("name") in EDIT_TOOLS:
                            fp = (b.get("input") or {}).get("file_path")
                            if fp and fp not in seen_files:
                                seen_files.add(fp)
                                changed.append(fp)

    # 의미 있는 내용이 없으면 노이즈를 남기지 않는다.
    if not prompts and not changed:
        sys.exit(0)

    now = datetime.now()
    os.makedirs(WIKI_INBOX, exist_ok=True)
    fname = f"{now:%Y-%m-%d-%H%M}-{project}-session.md"
    fpath = os.path.join(WIKI_INBOX, fname)

    lines = [
        f"# 세션 로그 — {project} — {now:%Y-%m-%d %H:%M}",
        "",
        f"- 프로젝트: `{cwd}`",
        f"- 세션 ID: `{session_id}`",
        f"- 종료 사유: `{reason}`",
        "",
        "## 요청",
        "",
    ]
    if prompts:
        for p in prompts:
            first = p.splitlines()[0].strip()
            if len(first) > 200:
                first = first[:200] + "…"
            lines.append(f"- {first}")
    else:
        lines.append("- (기록된 사용자 프롬프트 없음)")

    lines += ["", "## 변경/생성 파일", ""]
    if changed:
        for c in changed:
            lines.append(f"- `{c}`")
    else:
        lines.append("- (편집/생성된 파일 없음)")

    lines += [
        "",
        "---",
        "후보 기록입니다. 정식 문서는 사람이 검토한 뒤 [[Projects/realtime-wait/index]] 에 반영합니다.",
        "",
    ]

    with open(fpath, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    sys.exit(0)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # 세션 종료를 절대 막지 않는다.
        sys.exit(0)
