#!/usr/bin/env python3
"""Symbolic and numeric equivalence check for MathPilot (SymPy)."""
import json
import sys
from typing import Any

try:
    import sympy as sp
    from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application
except ImportError:
    print(json.dumps({"ok": False, "error": "sympy_not_installed"}))
    sys.exit(1)

TRANSFORMS = standard_transformations + (implicit_multiplication_application,)


def normalize(s: str) -> str:
    return (
        s.lower()
        .replace("^", "**")
        .replace("{", "(")
        .replace("}", ")")
        .replace(" ", "")
        .replace("\\cdot", "*")
    )


def parse_math(expr: str):
    expr = normalize(expr)
    return parse_expr(expr, transformations=TRANSFORMS)


def numeric_probe(expected, actual, variables: list[str]) -> bool:
    subs = {}
    for i, v in enumerate(variables or ["x"]):
        subs[sp.Symbol(v)] = [-2.3, -0.7, 0.6, 1.8, 3.1][i % 5]
    try:
        diff = abs(float((expected - actual).subs(subs).evalf()))
        return diff < 1e-6
    except Exception:
        return False


def check(expected: str, actual: str, variables: list[str] | None = None) -> dict[str, Any]:
    variables = variables or ["x"]
    if not actual.strip():
        return {"ok": True, "correct": False, "method": "text", "feedback": "Enter an answer first."}
    try:
        e = parse_math(expected)
        a = parse_math(actual)
        if sp.simplify(e - a) == 0:
            return {"ok": True, "correct": True, "method": "symbolic", "feedback": "Equivalent form accepted."}
        if numeric_probe(e, a, variables):
            return {"ok": True, "correct": True, "method": "numeric", "feedback": "Equivalent form accepted."}
        return {
            "ok": True,
            "correct": False,
            "method": "symbolic",
            "feedback": "This does not match the expected answer. Check your setup before simplifying.",
        }
    except Exception as ex:
        return {"ok": False, "error": str(ex), "correct": False, "method": "text", "feedback": "Could not parse expression."}


def main():
    raw = sys.stdin.read()
    payload = json.loads(raw) if raw.strip() else {}
    result = check(
        payload.get("expected", ""),
        payload.get("actual", ""),
        payload.get("variables"),
    )
    print(json.dumps(result))


if __name__ == "__main__":
    main()
