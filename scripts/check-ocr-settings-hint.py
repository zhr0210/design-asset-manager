#!/usr/bin/env python3
import os
import re
import sys

# Color output helpers
def green(text): return f"\033[92m{text}\033[0m"
def red(text): return f"\033[91m{text}\033[0m"
def yellow(text): return f"\033[93m{text}\033[0m"

def main():
    print("=" * 60)
    print("Running OCR Settings Hint Static QA Verification...")
    print("=" * 60)

    workspace = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    settings_tsx = os.path.join(workspace, "src", "renderer", "routes", "Settings.tsx")
    settings_store = os.path.join(workspace, "src", "renderer", "stores", "settings.store.ts")
    contract_ts = os.path.join(workspace, "src", "shared", "contracts", "ocr-healthcheck.contract.ts")
    ipc_ts = os.path.join(workspace, "src", "main", "ipc", "ocr-healthcheck.ipc.ts")
    service_ts = os.path.join(workspace, "src", "main", "services", "ocr-healthcheck.service.ts")
    settings_service = os.path.join(workspace, "src", "main", "services", "settings.service.ts")
    preload_ts = os.path.join(workspace, "src", "preload", "index.ts")

    missing_files = []
    for f in [settings_tsx, settings_store, contract_ts, ipc_ts, service_ts, settings_service, preload_ts]:
        if not os.path.isfile(f):
            missing_files.append(os.path.relpath(f, workspace))

    if missing_files:
        print(red(f"Error: Required source files are missing: {', '.join(missing_files)}"))
        sys.exit(1)

    # 1. Read files
    with open(settings_tsx, "r", encoding="utf-8") as f:
        settings_tsx_content = f.read()

    with open(settings_store, "r", encoding="utf-8") as f:
        settings_store_content = f.read()

    with open(contract_ts, "r", encoding="utf-8") as f:
        contract_ts_content = f.read()

    with open(ipc_ts, "r", encoding="utf-8") as f:
        ipc_ts_content = f.read()

    with open(service_ts, "r", encoding="utf-8") as f:
        service_ts_content = f.read()

    with open(settings_service, "r", encoding="utf-8") as f:
        settings_service_content = f.read()

    with open(preload_ts, "r", encoding="utf-8") as f:
        preload_ts_content = f.read()

    # Checks
    checks = {}

    # Check 1: Settings.tsx has manual button/handler
    has_handler = "handleOcrHealthCheck" in settings_tsx_content
    has_button = "检测 OCR 环境" in settings_tsx_content
    checks["Settings manual refresh"] = "PASS" if (has_handler and has_button) else "FAIL"

    # Check 2: No useEffect auto healthcheck
    # We find all useEffect blocks and check if they contain handleOcrHealthCheck or ocrHealthcheckRun
    use_effects = re.findall(r"useEffect\(\s*\(\s*\)\s*=>\s*\{([\s\S]*?)\},\s*\[.*?\]\)", settings_tsx_content)
    has_auto_call = False
    for block in use_effects:
        if "handleOcrHealthCheck" in block or "ocrHealthcheckRun" in block:
            has_auto_call = True
            break
    checks["No useEffect auto healthcheck"] = "FAIL" if has_auto_call else "PASS"

    # Check 3: No health persistence (both Settings.tsx updateSettings payload and settings.store.ts)
    handle_save_match = re.search(r"const handleSave =[\s\S]*?await updateSettings\(\{([\s\S]*?)\}\)", settings_tsx_content)
    has_persisted_keys = False
    if handle_save_match:
        args_block = handle_save_match.group(1)
        if any(k in args_block for k in ["ocrHealth", "ocrHealthCheckResult", "ocrHealthCheckError"]):
            has_persisted_keys = True

    has_store_health_fields = any(k in settings_store_content for k in ["ocrHealth", "ocrHealthCheckResult", "ocrHealthCheckError", "checkOcrHealth", "ocrHealthcheckRun"])

    checks["No health persistence"] = "FAIL" if (has_persisted_keys or has_store_health_fields) else "PASS"

    # Check 4: No provider auto switch (handleOcrHealthCheck doesn't call setTextDetectionProvider)
    handler_match = re.search(r"const handleOcrHealthCheck =[\s\S]*?finally\s*\{[\s\S]*?\}", settings_tsx_content)
    has_auto_switch = False
    if handler_match:
        handler_block = handler_match.group(0)
        if "setTextDetectionProvider" in handler_block:
            has_auto_switch = True
    checks["No provider auto switch"] = "FAIL" if has_auto_switch else "PASS"

    # Check 5: Preload read-only method
    has_preload_bridge = "ocrHealthcheckRun" in preload_ts_content
    checks["Preload read-only method"] = "PASS" if has_preload_bridge else "FAIL"

    # Check 6: IPC invoke-only (distinct from load/save, and registered)
    is_distinct = ("ocr-healthcheck:run" in ipc_ts_content or "CHANNEL_OCR_HEALTHCHECK_RUN" in ipc_ts_content) and "settingsLoad" not in ipc_ts_content and "settingsSave" not in ipc_ts_content
    checks["IPC invoke-only"] = "PASS" if is_distinct else "FAIL"

    # Check 7: Default provider none (in settings.service.ts defaults)
    default_match = re.search(r"textDetectionProvider:\s*'none'", settings_service_content)
    checks["Default provider none"] = "PASS" if default_match else "FAIL"

    # Check 8: No auto install wording (Allows manual pip hint, forbids exec/spawn/auto install command calls in renderer)
    has_auto_run_execution = any(cmd in settings_tsx_content or cmd in settings_store_content for cmd in ["child_process", "exec(", "spawn(", "execSync("])
    checks["No auto install wording"] = "FAIL" if has_auto_run_execution else "PASS"

    # Final overall evaluation
    all_pass = all(v == "PASS" for v in checks.values())
    overall = "PASS" if all_pass else "FAIL"

    print("\n[OCR_SETTINGS_HINT_QA]")
    for key, val in checks.items():
        color_fn = green if val == "PASS" else (red if val == "FAIL" else yellow)
        print(f"{key}: {color_fn(val)}")
    
    print(f"Overall status: {green('PASS') if all_pass else red('FAIL')}")
    print("=" * 60)

    if all_pass:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
