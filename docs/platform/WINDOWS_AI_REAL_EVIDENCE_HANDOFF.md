# Windows AI Real Evidence Handoff

Use this on the Windows host for the `codex/windows-ai-real-evidence` branch.

## Goal

Verify the Windows branch on real Windows hardware, not from macOS inference:

- CUDA compatibility and fixed-tensor execution.
- Registered ONNX model probes for WD Tagger and CLIP embedding.
- Windows Platform AI Branch Status shared response shape.
- Electron AI Console smoke with screenshot and overflow check.

## Commands

```powershell
cd $env:USERPROFILE\Desktop
git clone --branch codex/windows-ai-real-evidence https://github.com/zhr0210/design-asset-manager.git design-asset-manager-windows-ai
cd design-asset-manager-windows-ai
powershell -ExecutionPolicy Bypass -File .\scripts\windows-ai-real-evidence-validation.ps1
```

If the repo already exists:

```powershell
cd $env:USERPROFILE\Desktop\design-asset-manager-windows-ai
git fetch origin codex/windows-ai-real-evidence
git checkout codex/windows-ai-real-evidence
git pull --ff-only origin codex/windows-ai-real-evidence
powershell -ExecutionPolicy Bypass -File .\scripts\windows-ai-real-evidence-validation.ps1
```

## Evidence To Return

Return the generated desktop log:

```text
dam-windows-ai-validation-*.log
```

Also preserve this screenshot if generated:

```text
dam-windows-ai-console.png
```

Do not paste secrets, tokens, local private asset paths, or model-cache paths.
