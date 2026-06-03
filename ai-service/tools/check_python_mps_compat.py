import json
import sys

from core.python_mps_compat import probe_python_mps_environment


def emit(payload):
    print(json.dumps(payload, ensure_ascii=False), flush=True)


def main():
    if hasattr(sys.stdin, "reconfigure"):
        sys.stdin.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    try:
        raw = sys.stdin.read().strip()
        _ = json.loads(raw) if raw else {}
    except Exception as e:
        emit({
            "success": False,
            "compatible": False,
            "error": {"code": "INPUT_PARSE_FAILED", "message": f"解析输入失败: {str(e)}"}
        })
        sys.exit(1)

    emit(probe_python_mps_environment())


if __name__ == "__main__":
    main()
