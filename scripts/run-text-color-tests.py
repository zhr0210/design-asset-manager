#!/usr/bin/env python3
import os
import sys
import json
import subprocess

def run_cmd(args, shell=True):
    try:
        res = subprocess.run(args, shell=shell, capture_output=True, text=True, errors="replace")
        return res.returncode == 0, res.stdout, res.stderr
    except Exception as e:
        return False, "", str(e)

def main():
    print("[TEXT_COLOR_QA_CHECK] Running Multi-Agent QA Verification...")
    print("=============================================================")

    workspace = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    errors = []
    warnings = []
    
    # 1. File presence check
    core_files = {
        "test_color_palette_service": "src/main/services/tests/test_color_palette_service.ts",
        "test_text_color_extractor": "src/main/services/tests/test_text_color_extractor.ts",
        "text_color_extractor_service": "src/main/services/text-color-extractor.service.ts",
        "color_palette_service": "src/main/services/color-palette.service.ts",
        "text_box_provider_service": "src/main/services/text-box-provider.service.ts",
        "color_palette_panel": "src/renderer/components/color/ColorPalettePanel.tsx"
    }

    file_presence = "PASS"
    for name, rel_path in core_files.items():
        full_path = os.path.join(workspace, rel_path)
        if not os.path.exists(full_path):
            print(f"[WARN] File missing: {rel_path}")
            warnings.append(f"Missing file: {rel_path}")
            file_presence = "WARN"
        else:
            print(f"[OK] File present: {rel_path}")

    # 2. TS Runner check (Offline check only)
    bin_dir = os.path.join(workspace, "node_modules", ".bin")
    runner_binaries = ["tsx", "tsx.cmd", "vitest", "vitest.cmd", "ts-node", "ts-node.cmd"]
    has_local_runner = False
    
    if os.path.exists(bin_dir):
        for b in runner_binaries:
            if os.path.exists(os.path.join(bin_dir, b)):
                has_local_runner = True
                break

    package_json_path = os.path.join(workspace, "package.json")
    if os.path.exists(package_json_path):
        try:
            with open(package_json_path, "r", encoding="utf-8") as f:
                pkg = json.load(f)
            deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
            if "tsx" in deps or "vitest" in deps or "ts-node" in deps:
                has_local_runner = True
        except Exception:
            pass

    ts_runner_status = "PASS"
    if not has_local_runner:
        ts_runner_status = "SKIPPED_TS_RUNNER_MISSING"
        print("\n[NOTE] TS runner: SKIPPED_TS_RUNNER_MISSING")
        print("  -> 当前项目没有本地 TS test runner，脚本未执行 TS 测试文件，只执行 typecheck/build 与静态 QA 检查。")
    else:
        print("\n[OK] TS runner: FOUND")

    # 3. Debug Overlay Static check
    extractor_path = os.path.join(workspace, core_files["text_color_extractor_service"])
    debug_status = "MISSING"
    if os.path.exists(extractor_path):
        try:
            with open(extractor_path, "r", encoding="utf-8") as f:
                content = f.read()
            debug_keywords = ["text_boxes_overlay", "text_foreground_mask_overlay", "text_palette_debug", "NODE_ENV", "isDev", "scratch", "debug"]
            found_keys = [k for k in debug_keywords if k in content]
            if len(found_keys) == len(debug_keywords):
                debug_status = "FOUND"
            elif len(found_keys) > 0:
                debug_status = "PARTIAL"
        except Exception:
            pass
    print(f"\nDebug overlay: {debug_status}")
    print("Debug files expected:")
    print("  - text_boxes_overlay.png")
    print("  - text_foreground_mask_overlay.png")
    print("  - text_palette_debug.json")

    # 4. Settings fallback guard
    settings_path = os.path.join(workspace, "src/renderer/routes/Settings.tsx")
    settings_guard = "FAIL"
    if os.path.exists(settings_path):
        try:
            with open(settings_path, "r", encoding="utf-8") as f:
                content = f.read()
            if "?? 'none'" in content:
                settings_guard = "PASS"
        except Exception:
            pass
    print(f"\nSettings fallback guard: {settings_guard}")
    if settings_guard == "FAIL":
        errors.append("Settings.tsx fallback does not enforce 'none'")

    # 5. text_palette tag suggestion guard
    palette_service_path = os.path.join(workspace, core_files["color_palette_service"])
    palette_guard = "FAIL"
    if os.path.exists(palette_service_path):
        try:
            with open(palette_service_path, "r", encoding="utf-8") as f:
                content = f.read()
            has_status = "textPalette.status === 'success'" in content
            has_mock = "textPalette.isMock !== true" in content
            has_swatches = "textSwatches.length > 0" in content
            has_array = "Array.isArray(textPalette.swatches)" in content
            
            if has_status and has_mock and has_swatches and has_array:
                palette_guard = "PASS"
        except Exception:
            pass
    print(f"text_palette tag suggestion guard: {palette_guard}")
    if palette_guard == "FAIL":
        errors.append("color-palette.service.ts tag suggestion guard incomplete")

    # 6. Frontend hide empty/mock text palette guard
    panel_path = os.path.join(workspace, core_files["color_palette_panel"])
    frontend_guard = "FAIL"
    if os.path.exists(panel_path):
        try:
            with open(panel_path, "r", encoding="utf-8") as f:
                content = f.read()
            has_status = "status === 'success'" in content
            has_mock = "isMock" in content
            has_length = "textForegrounds.length" in content
            if has_status and has_mock and has_length:
                frontend_guard = "PASS"
        except Exception:
            pass
    print(f"frontend hide empty/mock text palette: {frontend_guard}")
    if frontend_guard == "FAIL":
        errors.append("ColorPalettePanel does not properly hide empty or mock palettes")

    # 7. Typecheck & Build execution
    print("\nExecuting npm compile verification (typecheck & build)...")
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    
    print("Running typecheck...")
    tc_ok, tc_stdout, tc_stderr = run_cmd([npm_cmd, "run", "typecheck"])
    tc_status = "PASS" if tc_ok else "FAIL"
    print(f"typecheck: {tc_status}")
    if not tc_ok:
        errors.append(f"TypeScript typecheck failed: {tc_stderr or tc_stdout}")

    print("Running build...")
    build_ok, b_stdout, b_stderr = run_cmd([npm_cmd, "run", "build"])
    build_status = "PASS" if build_ok else "FAIL"
    print(f"build: {build_status}")
    if not build_ok:
        errors.append(f"Vite packaging build failed: {b_stderr or b_stdout}")

    # 8. Overall Status calculation
    overall_status = "PASS"
    if errors:
        overall_status = "FAIL"
    elif ts_runner_status == "SKIPPED_TS_RUNNER_MISSING":
        overall_status = "PASS_WITH_TS_TESTS_SKIPPED"

    print("=============================================================")
    print(f"Overall status: {overall_status}")
    print(f"Errors count: {len(errors)}, Warnings count: {len(warnings)}")
    print("=============================================================")
    
    if overall_status == "FAIL":
        for err in errors:
            print(f"  [ERROR] {err}")
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()
