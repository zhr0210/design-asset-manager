#!/usr/bin/env python3
"""Validate the compact ADR router against the complete decision corpus."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ADR_DIR = ROOT / "docs" / "adr"
ROUTER = ADR_DIR / "README.md"

EXPECTED_COUNTS = {
    "Core ADRs": 89,
    "Spec-candidate ADRs": 195,
    "Historical ADRs": 9,
    "Supporting ADRs": 199,
}


def expand_token(token: str) -> set[int]:
    token = token.strip()
    match = re.fullmatch(r"(\d{4})(?:[–-](\d{4}))?", token)
    if not match:
        raise ValueError(f"Invalid ADR number token: {token!r}")
    start = int(match.group(1))
    end = int(match.group(2) or start)
    if end < start:
        raise ValueError(f"Descending ADR range: {token!r}")
    return set(range(start, end + 1))


def parse_fenced_class(router: str, heading: str) -> set[int]:
    match = re.search(
        rf"^### {re.escape(heading)}\s*\n+```text\s*\n(.*?)\n```",
        router,
        re.MULTILINE | re.DOTALL,
    )
    if not match:
        raise ValueError(f"Missing fenced classification section: {heading}")

    numbers: set[int] = set()
    for token in re.split(r"[,\s]+", match.group(1).strip()):
        if token:
            expanded = expand_token(token)
            overlap = numbers & expanded
            if overlap:
                raise ValueError(
                    f"Duplicate ADR number in {heading}: "
                    f"{', '.join(f'{number:04d}' for number in sorted(overlap))}"
                )
            numbers.update(expanded)
    return numbers


def parse_historical(router: str) -> set[int]:
    match = re.search(
        r"^### Historical ADRs\s*\n(.*?)(?=^## Product Spine)",
        router,
        re.MULTILINE | re.DOTALL,
    )
    if not match:
        raise ValueError("Missing Historical ADRs table")

    numbers: set[int] = set()
    for line in match.group(1).splitlines():
        cells = [cell.strip() for cell in line.split("|")]
        if len(cells) < 3 or not re.fullmatch(r"\d{4}(?:[–-]\d{4})?", cells[1]):
            continue
        expanded = expand_token(cells[1])
        overlap = numbers & expanded
        if overlap:
            raise ValueError(
                "Duplicate historical ADR number: "
                + ", ".join(f"{number:04d}" for number in sorted(overlap))
            )
        numbers.update(expanded)
    return numbers


def main() -> int:
    errors: list[str] = []

    adr_files: dict[int, Path] = {}
    for path in sorted(ADR_DIR.glob("[0-9][0-9][0-9][0-9]-*.md")):
        number = int(path.name[:4])
        if number in adr_files:
            errors.append(
                f"Duplicate ADR {number:04d}: "
                f"{adr_files[number].name}, {path.name}"
            )
        adr_files[number] = path

    corpus = set(adr_files)
    expected_corpus = set(range(1, 493))
    missing = expected_corpus - corpus
    unexpected = corpus - expected_corpus
    if missing:
        errors.append(
            "Missing ADR files: "
            + ", ".join(f"{number:04d}" for number in sorted(missing))
        )
    if unexpected:
        errors.append(
            "Unexpected ADR numbers: "
            + ", ".join(f"{number:04d}" for number in sorted(unexpected))
        )

    if not ROUTER.exists():
        errors.append("Missing docs/adr/README.md")
        router = ""
    else:
        router = ROUTER.read_text(encoding="utf-8")

    try:
        core = parse_fenced_class(router, "Core ADRs")
        spec = parse_fenced_class(router, "Spec-candidate ADRs")
        historical = parse_historical(router)
    except ValueError as exc:
        errors.append(str(exc))
        core, spec, historical = set(), set(), set()

    overlaps = {
        "Core/Spec-candidate": core & spec,
        "Core/Historical": core & historical,
        "Spec-candidate/Historical": spec & historical,
    }
    for label, numbers in overlaps.items():
        if numbers:
            errors.append(
                f"{label} overlap: "
                + ", ".join(f"{number:04d}" for number in sorted(numbers))
            )

    supporting = expected_corpus - core - spec - historical
    actual_counts = {
        "Core ADRs": len(core),
        "Spec-candidate ADRs": len(spec),
        "Historical ADRs": len(historical),
        "Supporting ADRs": len(supporting),
    }
    for label, expected in EXPECTED_COUNTS.items():
        actual = actual_counts[label]
        if actual != expected:
            errors.append(f"{label} count is {actual}, expected {expected}")

    classified = core | spec | historical | supporting
    if classified != expected_corpus:
        errors.append("ADR classifications do not cover exactly 0001–0492")

    for number in sorted(historical):
        path = adr_files.get(number)
        if not path:
            continue
        text = path.read_text(encoding="utf-8")
        if not re.search(r"^Status:\s+Superseded\b", text, re.MULTILINE):
            errors.append(
                f"Historical ADR {number:04d} lacks an explicit "
                f"'Status: Superseded' line ({path.name})"
            )

    dangling: dict[int, set[int]] = {}
    for number, path in adr_files.items():
        text = path.read_text(encoding="utf-8")
        references = {
            int(value)
            for value in re.findall(r"\bADR(?:s)?[ -]?(\d{4})\b", text)
        }
        missing_references = references - corpus
        if missing_references:
            dangling[number] = missing_references
    for number, references in sorted(dangling.items()):
        errors.append(
            f"ADR {number:04d} has dangling references: "
            + ", ".join(f"{reference:04d}" for reference in sorted(references))
        )

    if errors:
        print("[FAIL] ADR router validation failed")
        for error in errors:
            print(f"- {error}")
        return 1

    print("[PASS] ADR router validation passed")
    print(
        "492 ADRs: "
        f"{len(core)} Core, {len(supporting)} Supporting, "
        f"{len(spec)} Spec-candidate, {len(historical)} Historical"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
